import { v4 as uuidv4 } from 'uuid'

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem('comiclife_session_id')
  if (!sessionId) {
    sessionId = uuidv4()
    localStorage.setItem('comiclife_session_id', sessionId)
  }
  return sessionId
}
