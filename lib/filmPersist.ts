import type { FilmAudio, ShotList } from '../types/film'

let timers: Record<string, ReturnType<typeof setTimeout>> = {}

export interface PersistPayload {
  comicId: string
  shotList?: ShotList
  audio?: FilmAudio
  finalVideoUrl?: string | null
}

/**
 * Fire-and-forget upsert to /api/film/state. Debounced per comicId so rapid
 * shot-update chatter during a batch run collapses into a single request.
 */
export function persistFilmState(payload: PersistPayload, delay = 600) {
  if (typeof window === 'undefined') return
  const key = payload.comicId
  if (timers[key]) clearTimeout(timers[key])
  timers[key] = setTimeout(() => {
    fetch('/api/film/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((e) => console.warn('persist failed:', e))
  }, delay)
}

export async function loadFilmState(comicId: string) {
  const res = await fetch(`/api/film/state?comicId=${encodeURIComponent(comicId)}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return (await res.json()) as {
    shotList: ShotList | null
    audio: FilmAudio | null
    finalVideoUrl: string | null
  }
}
