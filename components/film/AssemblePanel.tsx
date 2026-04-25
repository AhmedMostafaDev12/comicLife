'use client'

import { useState } from 'react'
import { useFilmStore } from '../../store/useFilmStore'

interface Props {
  comicId: string
  onComplete: () => void
}

export default function AssemblePanel({ comicId, onComplete }: Props) {
  const {
    shotList,
    audio,
    finalVideoUrl,
    setFinalVideoUrl,
    isAssembling,
    setIsAssembling,
    assemblyProgress,
    setAssemblyProgress,
  } = useFilmStore()
  const [error, setError] = useState<string | null>(null)

  const readyCount = shotList?.shots.filter((s) => s.videoUrl).length ?? 0
  const totalCount = shotList?.shots.length ?? 0
  const hasAny = readyCount > 0
  const partial = hasAny && readyCount < totalCount

  const assemble = async () => {
    setError(null)
    setIsAssembling(true)
    setAssemblyProgress(5)
    try {
      const res = await fetch('/api/film/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId, shotList, audio }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Assemble failed')
      const data = await res.json()
      setAssemblyProgress(100)
      setFinalVideoUrl(data.videoUrl)
      onComplete()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsAssembling(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-barlow font-black text-2xl uppercase tracking-tight text-ink mb-1">
          Final Assembly
        </h2>
        <p className="font-dm text-muted text-sm">
          Stitches all shots, mixes audio, applies the grade, and exports a 9:16 MP4.
        </p>
      </div>

      {!hasAny && (
        <div className="bg-red-50 border border-red-200 rounded p-3 font-mono text-[10px] uppercase tracking-wider text-red-700">
          No shots have been generated yet. Generate at least one shot first.
        </div>
      )}
      {partial && (
        <div className="bg-yellow/20 border border-yellow rounded p-3 font-mono text-[10px] uppercase tracking-wider text-ink">
          Only {readyCount} of {totalCount} shots are ready. The film will be assembled
          from those — missing shots will be skipped.
        </div>
      )}

      {finalVideoUrl ? (
        <div className="flex flex-col gap-3">
          <video
            src={finalVideoUrl}
            controls
            className="w-full max-w-[420px] aspect-[9/16] bg-ink rounded-card mx-auto"
          />
          <a
            href={finalVideoUrl}
            download
            className="self-center bg-ink text-yellow font-mono text-[11px] font-bold uppercase tracking-wider px-8 py-4 rounded-full hover:bg-ink/90"
          >
            Download MP4
          </a>
        </div>
      ) : (
        <button
          onClick={assemble}
          disabled={!hasAny || isAssembling}
          className="self-start bg-yellow text-ink font-mono text-[11px] font-bold uppercase tracking-wider px-8 py-4 rounded-full hover:bg-[#c8dc38] disabled:opacity-50"
        >
          {isAssembling ? `Assembling... ${assemblyProgress}%` : 'Assemble film'}
        </button>
      )}

      {isAssembling && (
        <div className="w-full bg-ink/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-yellow h-full transition-all"
            style={{ width: `${assemblyProgress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="font-mono text-[10px] text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}
    </div>
  )
}
