/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../utils/withTimeout'

const AuthContext = createContext()
const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = 'nexumathedu:last-activity'

export const useAuth = () => useContext(AuthContext)

const recordActivity = () => {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
  } catch {
    // Silently ignore storage errors in restricted contexts
  }
}

const readLastActivity = () => {
  try {
    const value = window.localStorage.getItem(LAST_ACTIVITY_KEY)
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

const shouldInvalidateSession = () => {
  const lastActivity = readLastActivity()
  if (lastActivity === null) return false
  return Date.now() - lastActivity > IDLE_TIMEOUT_MS
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const isHandlingAuthRef = useRef(false)
  const sessionRef = useRef(null)
  const profileRef = useRef(null)

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

    const fallbackRole =
      userRecord?.user_metadata?.role ||
      userRecord?.app_metadata?.role ||
      profileRef.current?.role ||
      'student'
    const fallbackFullName =
      userRecord?.user_metadata?.full_name ||
      userRecord?.email ||
      profileRef.current?.full_name ||
      'Sin nombre'

    const fallbackProfile = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: fallbackFullName,
      role: fallbackRole,
    }

    // Establecemos de inmediato el perfil base con la metadata para evitar demoras en UI
    if (!profileRef.current) {
      setProfile(fallbackProfile)
    }

    const promise = (async () => {
      try {
        const { data } = await withTimeout(
          supabase.from('profiles').select('*').eq('id', userRecord.id).maybeSingle(),
          6000,
          'La consulta del perfil tardó demasiado'
        )

        if (data) {
          setProfile(data)
          return data
        }

        if (profileRef.current?.id === userRecord.id) {
          return profileRef.current
        }

      } catch {
        if (profileRef.current?.id === userRecord.id) {
          return profileRef.current
        }
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
      if (isMounted) setLoading(true)

      try {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          6000,
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
      } catch {
        // Silently continue to fallback state
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
        } catch {
          // Silently ignore storage error
        }
        void supabase.auth.signOut().catch(() => {
          // Silently ignore sign out failure on inactive session
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
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      45000,
      'El inicio de sesión tardó demasiado. Intenta de nuevo.'
    )
    if (error) throw error

    if (data?.session?.user) {
      setSession(data.session)
      await fetchProfile(data.session.user)
      setUser(data.session.user)
      recordActivity()
    }

    return data
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Limpiamos localmente incluso si hay error de red
    } finally {
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
