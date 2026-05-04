'use client'

import { useEffect } from 'react'
import { useSessionStore } from '../../store/useSessionStore'
import { createSupabaseClient } from '../../lib/supabase'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const { initSession, setLoggedIn } = useSessionStore()

  useEffect(() => {
    initSession()

    const supabase = createSupabaseClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [initSession, setLoggedIn])

  return <>{children}</>
}
