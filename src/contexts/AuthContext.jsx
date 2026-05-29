/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userRecord) {
    // Primero intentamos leer el perfil desde la tabla; si falla, caemos a metadata.
    const fallbackRole =
      userRecord?.user_metadata?.role || userRecord?.app_metadata?.role || 'student'

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userRecord.id)
        .maybeSingle()

      if (!error && data) {
        setProfile(data)
        return data
      }
    } catch (error) {
      console.warn('Profile lookup failed, using auth metadata fallback.', error)
    }

    const fallbackProfile = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord?.user_metadata?.full_name || userRecord.email,
      role: fallbackRole,
    }

    setProfile(fallbackProfile)
    return fallbackProfile
  }

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      // Resolvemos la sesion actual cuando la app arranca.
      if (isMounted) setLoading(true)

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          setSession(session)
          setUser(session.user)
          await fetchProfile(session.user)
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

      setLoading(true)

      try {
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          await fetchProfile(session.user)
        } else {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(handleAuthChange)

    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    if (data?.session?.user) {
      setSession(data.session)
      setUser(data.session.user)
      await fetchProfile(data.session.user)
    }

    return data
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
    isAuthenticated: !!user,
    role: profile?.role || null,
    hasProfile: !!profile,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
