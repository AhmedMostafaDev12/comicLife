'use client'

import { useEffect } from 'react'
import { useSessionStore } from '../../store/useSessionStore'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const initSession = useSessionStore((state) => state.initSession)

  useEffect(() => {
    initSession()
  }, [initSession])

  return <>{children}</>
}
