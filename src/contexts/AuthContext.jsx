/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userRecord) {
    const fallbackRole = userRecord?.user_metadata?.role || userRecord?.app_metadata?.role || null

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

    if (fallbackRole) {
      const fallbackProfile = {
        id: userRecord.id,
        email: userRecord.email,
        full_name: userRecord?.user_metadata?.full_name || userRecord.email,
        role: fallbackRole,
      }

      setProfile(fallbackProfile)
      return fallbackProfile
    }

    return null
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          void fetchProfile(session.user)
        }
      } catch (error) {
        console.error('Failed to initialize auth session', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        void fetchProfile(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    login,
    logout,
    isAuthenticated: !!user,
    role: profile?.role || null,
    hasProfile: !!profile,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
