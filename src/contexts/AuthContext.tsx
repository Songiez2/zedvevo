import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Use SECURITY DEFINER RPC to bypass all RLS — guarantees profile always loads
  const fetchProfile = async (userId: string, email?: string) => {
    // Primary: use the RPC that bypasses RLS
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
    if (!rpcError && rpcData && rpcData.length > 0) {
      setProfile(rpcData[0] as Profile)
      return
    }

    // Fallback: direct table query
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!error && data) { setProfile(data); return }

    // Last resort: if known admin email, force-create and re-fetch
    if (email === 'topkuchalo@gmail.com') {
      await supabase.rpc('ensure_admin_profile', { p_user_id: userId, p_email: email })
      const { data: retry } = await supabase.rpc('get_my_profile')
      if (retry && retry.length > 0) setProfile(retry[0] as Profile)
      return
    }

    // Trigger may not have fired yet — wait 1.5s and retry once
    if (!data) {
      setTimeout(async () => {
        const { data: retry } = await supabase.rpc('get_my_profile')
        if (retry && retry.length > 0) setProfile(retry[0] as Profile)
      }, 1500)
    }
  }

  const refreshProfile = async () => {
    if (session?.user?.id) await fetchProfile(session.user.id, session.user.email)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id, session.user.email)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
