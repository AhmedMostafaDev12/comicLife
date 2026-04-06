import { create } from 'zustand'
import { Profile } from '../types'
import { getOrCreateSessionId } from '../lib/session'

interface SessionStore {
  sessionId: string | null
  profile: Profile | null
  avatarUrl: string | null
  comicStyle: string
  
  initSession: () => void
  setProfile: (p: Profile) => void
  setAvatar: (url: string) => void
  setStyle: (s: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  profile: null,
  avatarUrl: null,
  comicStyle: 'painterly',
  
  initSession: () => {
    const id = getOrCreateSessionId()
    set({ sessionId: id })
  },
  
  setProfile: (p) => set({ profile: p }),
  setAvatar: (url) => set({ avatarUrl: url }),
  setStyle: (s) => set({ comicStyle: s }),
}))
