/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../utils/withTimeout'

const AuthContext = createContext()
const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = 'nexumathedu:last-activity'

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const isHandlingAuthRef = useRef(false)
  const sessionRef = useRef(null)
  const profileRef = useRef(null)

  const recordActivity = () => {
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    } catch (error) {
      console.warn('Unable to record activity timestamp.', error)
    }
  }

  const readLastActivity = () => {
    try {
      const value = window.localStorage.getItem(LAST_ACTIVITY_KEY)
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    } catch (error) {
      console.warn('Unable to read activity timestamp.', error)
      return null
    }
  }

  const shouldInvalidateSession = () => {
    const lastActivity = readLastActivity()
    if (lastActivity === null) return false
    return Date.now() - lastActivity > IDLE_TIMEOUT_MS
  }

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  const profilePromiseCacheRef = useRef(null)

  async function fetchProfile(userRecord) {
    if (profilePromiseCacheRef.current) {
      return profilePromiseCacheRef.current
    }

    const promise = (async () => {
      // Primero intentamos leer el perfil desde la tabla; si falla, caemos a metadata.
      const fallbackRole =
        userRecord?.app_metadata?.role ||
        profileRef.current?.role ||
        'student'
      const fallbackFullName =
        userRecord?.user_metadata?.full_name ||
        userRecord?.email ||
        profileRef.current?.full_name ||
        'Sin nombre'

      try {
        const { data, error } = await withTimeout(
          supabase.from('profiles').select('*').eq('id', userRecord.id).maybeSingle(),
          45000,
          'La consulta del perfil tardó demasiado'
        )

        if (!error && data) {
          console.debug('Profile loaded from database:', { id: data.id, role: data.role })
          setProfile(data)
          return data
        }

        if (profileRef.current?.id === userRecord.id) {
          console.info('Keeping existing cached profile for current user instead of fallback.')
          return profileRef.current
        }

        if (error) {
          console.warn('Profile query error:', error.message)
        }
      } catch (error) {
        console.warn(
          'Profile lookup failed, using auth metadata fallback.',
          error instanceof Error ? error.message : error
        )
        if (profileRef.current?.id === userRecord.id) {
          console.info('Keeping existing cached profile for current user instead of fallback.')
          return profileRef.current
        }
      }

      console.info(
        'Using auth metadata fallback. Role:',
        fallbackRole,
        'Email:',
        userRecord.email
      )

      const fallbackProfile = {
        id: userRecord.id,
        email: userRecord.email,
        full_name: fallbackFullName,
        role: fallbackRole,
      }

      setProfile(fallbackProfile)
      return fallbackProfile
    })()

    profilePromiseCacheRef.current = promise
    try {
      return await promise
    } finally {
      profilePromiseCacheRef.current = null
    }
  }

  const refreshProfile = async () => {
    if (!user?.id) {
      return null
    }

    return fetchProfile(user)
  }

  useEffect(() => {
    let isMounted = true
    recordActivity()

    const clearAuthState = () => {
      setSession(null)
      setUser(null)
      setProfile(null)
    }

    const initializeAuth = async () => {
      // Resolvemos la sesion actual cuando la app arranca.
      if (isMounted) setLoading(true)

      try {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          45000,
          'La verificación de sesión tardó demasiado'
        )

        if (!isMounted) return

        if (session?.user && shouldInvalidateSession()) {
          await supabase.auth.signOut()
          clearAuthState()
          setLoading(false)
          return
        }

        if (session?.user) {
          setSession(session)
          await fetchProfile(session.user)
          setUser(session.user)
          recordActivity()
        } else {
          clearAuthState()
        }
      } catch (error) {
        console.error('Failed to initialize auth session', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initializeAuth()

    // Escuchamos cambios de autenticacion para mantener el estado sincronizado.
    const handleAuthChange = async (event, session) => {
      if (!isMounted) return
      if (isHandlingAuthRef.current) return

      isHandlingAuthRef.current = true

      try {
        if (event === 'SIGNED_OUT') {
          clearAuthState()
          return
        }

        if (session?.user && shouldInvalidateSession()) {
          await supabase.auth.signOut()
          clearAuthState()
          return
        }

        if (session?.user) {
          setSession(session)
          if (event !== 'TOKEN_REFRESHED') {
            await fetchProfile(session.user)
          }
          setUser(session.user)
          recordActivity()
        } else {
          clearAuthState()
        }
      } finally {
        isHandlingAuthRef.current = false
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(handleAuthChange)

    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'visibilitychange']
    const markActive = () => {
      if (document.visibilityState === 'hidden') return
      recordActivity()
    }

    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }))

    const inactivityTimer = window.setInterval(() => {
      if (!sessionRef.current?.user) return

      if (shouldInvalidateSession()) {
        try {
          window.sessionStorage.setItem('nexumathedu:session-expired', 'true')
        } catch (e) {
          console.warn('Could not set session-expired flag in sessionStorage', e)
        }
        void supabase.auth.signOut().catch((error) => {
          console.error('Auto sign out failed:', error)
        })
        setSession(null)
        setUser(null)
        setProfile(null)
      }
    }, 60 * 1000)

    return () => {
      isMounted = false
      window.clearInterval(inactivityTimer)
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive))
      listener?.subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        45000,
        'El inicio de sesión tardó demasiado. Intenta de nuevo.'
      )
      if (error) throw error

      if (data?.session?.user) {
        setSession(data.session)
        const userProfile = await fetchProfile(data.session.user)
        setUser(data.session.user)
        recordActivity()
        console.info(
          'User logged in:',
          data.session.user.email,
          'role:',
          userProfile?.role || data.session.user.user_metadata?.role
        )
      }

      return data
    } catch (error) {
      console.error('Login error:', error instanceof Error ? error.message : error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during logout:', error)
      // Limpiamos localmente incluso si hay error
      setSession(null)
      setUser(null)
      setProfile(null)
    }
  }

  const updatePassword = async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    if (data?.user) setUser(data.user)
    return data
  }

  const value = {
    // Exponemos todo lo que el resto de la app necesita saber del usuario.
    user,
    profile,
    session,
    login,
    logout,
    updatePassword,
    refreshProfile,
    isAuthenticated: !!user,
    role: profile?.role || null,
    hasProfile: !!profile,
    loading,
    recordActivity,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
