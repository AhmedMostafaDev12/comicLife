import type { ShotList } from '../types/film'

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1'

export interface NarrationLine {
  shotId: string
  text: string
  startSecond: number
  durationSeconds: number
}

export function buildNarrationScript(shotList: ShotList): NarrationLine[] {
  const out: NarrationLine[] = []
  let cursor = 0
  for (const shot of shotList.shots) {
    if (shot.audio?.vo && shot.audio.vo.trim()) {
      out.push({
        shotId: shot.id,
        text: shot.audio.vo.trim(),
        startSecond: cursor,
        durationSeconds: shot.duration,
      })
    }
    cursor += shot.duration
  }
  return out
}

/**
 * Generate one continuous narration MP3 from the concatenated VO lines.
 * Each line is separated by an em-dash to encourage natural pauses.
 * For per-shot timing, see buildNarrationScript().
 */
export async function generateNarration(lines: NarrationLine[]): Promise<Buffer | null> {
  if (lines.length === 0) return null

  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!apiKey || !voiceId) {
    throw new Error('ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID not set')
  }

  const text = lines.map((l) => l.text).join(' — ')

  const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.3 },
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`ElevenLabs error (${res.status}): ${t}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Pick a music bed URL based on the source. v1: library mode picks a single
 * curated track per mood; other sources are stubs returning null until wired.
 */
export async function pickMusicBed(
  source: 'library' | 'spotify' | 'suno' | 'upload',
  mood: string
): Promise<string | null> {
  if (source === 'library') {
    return libraryTrackForMood(mood)
  }
  return null
}

function libraryTrackForMood(_mood: string): string | null {
  // TODO: wire to a real royalty-free library (Pixabay Music, Uppbeat, etc.)
  // Placeholder: a single ambient bed shipped as a public asset.
  return '/audio/library/ambient-default.mp3'
}
