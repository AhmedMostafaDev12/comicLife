import { create } from 'zustand'
import { Profile } from '@/types'
import { getOrCreateSessionId } from '@/lib/session'

interface SessionStore {
  sessionId: string | null
  profile: Profile | null
  avatarUrl: string | null
  comicStyle: string
  isLoggedIn: boolean

  initSession: () => void
  setProfile: (p: Profile) => void
  setAvatar: (url: string) => void
  setStyle: (s: string) => void
  setLoggedIn: (v: boolean) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  profile: null,
  avatarUrl: null,
  comicStyle: 'painterly',
  isLoggedIn: false,

  initSession: () => {
    const id = getOrCreateSessionId()
    set({ sessionId: id })
  },

  setProfile: (p) => set({ profile: p }),
  setAvatar: (url) => set({ avatarUrl: url }),
  setStyle: (s) => set({ comicStyle: s }),
  setLoggedIn: (v) => set({ isLoggedIn: v }),
}))
