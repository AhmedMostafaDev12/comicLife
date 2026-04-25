'use client'

import { useState } from 'react'
import { useFilmStore } from '../../store/useFilmStore'

interface Props {
  comicId: string
  onComplete: () => void
}

export default function AudioPanel({ comicId, onComplete }: Props) {
  const { audio, setAudio, shotList } = useFilmStore()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAudio = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/film/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comicId,
          shotList,
          musicSource: audio.musicSource || 'library',
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Audio failed')
      const data = await res.json()
      setAudio({ narrationUrl: data.narrationUrl, musicUrl: data.musicUrl })
      onComplete()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-barlow font-black text-2xl uppercase tracking-tight text-ink mb-1">
          Audio Layer
        </h2>
        <p className="font-dm text-muted text-sm">
          Narration is built from voiceover lines on each shot. Pick a music bed.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
          Music source
        </label>
        <div className="flex flex-wrap gap-2">
          {(['library', 'spotify', 'suno', 'upload'] as const).map((src) => (
            <button
              key={src}
              onClick={() => setAudio({ musicSource: src })}
              className={`px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-wider border ${
                audio.musicSource === src
                  ? 'bg-ink text-yellow border-ink'
                  : 'border-ink/20 text-ink hover:border-ink'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {audio.narrationUrl && (
        <div className="flex flex-col gap-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            Narration preview
          </label>
          <audio src={audio.narrationUrl} controls className="w-full" />
        </div>
      )}
      {audio.musicUrl && (
        <div className="flex flex-col gap-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            Music bed preview
          </label>
          <audio src={audio.musicUrl} controls className="w-full" />
        </div>
      )}

      {error && (
        <p className="font-mono text-[10px] text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={generateAudio}
          disabled={generating}
          className="bg-yellow text-ink font-mono text-[11px] font-bold uppercase tracking-wider px-8 py-4 rounded-full hover:bg-[#c8dc38] disabled:opacity-50"
        >
          {generating ? 'Generating audio...' : 'Generate audio'}
        </button>
        <button
          onClick={() => {
            setAudio({ narrationUrl: undefined, musicUrl: undefined })
            onComplete()
          }}
          disabled={generating}
          className="border border-ink/20 text-ink font-mono text-[11px] uppercase tracking-wider px-8 py-4 rounded-full hover:border-ink disabled:opacity-50"
        >
          Skip audio →
        </button>
      </div>
    </div>
  )
}
