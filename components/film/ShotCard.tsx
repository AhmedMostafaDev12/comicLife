'use client'

import { useState } from 'react'
import type { Shot } from '../../types/film'
import { useFilmStore } from '../../store/useFilmStore'

interface Props {
  shot: Shot
  index: number
  comicId: string
  previousShot?: Shot
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-ink/10 text-ink/60',
  keyframing: 'bg-yellow/30 text-ink',
  keyframed: 'bg-yellow/60 text-ink',
  generating: 'bg-yellow text-ink animate-pulse',
  ready: 'bg-emerald-500/20 text-emerald-700',
  failed: 'bg-red-500/20 text-red-700',
}

export default function ShotCard({ shot, index, comicId, previousShot, onMoveUp, onMoveDown }: Props) {
  const { updateShot, removeShot, setShotStatus } = useFilmStore()
  const [expanded, setExpanded] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(false)

  const generateKeyframe = async () => {
    setShotStatus(shot.id, 'keyframing')
    try {
      const res = await fetch('/api/film/keyframes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId, shotId: shot.id, shot }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Keyframe failed')
      const { keyframeUrl } = await res.json()
      updateShot(shot.id, { keyframeUrl, status: 'keyframed' })
    } catch (e: any) {
      setShotStatus(shot.id, 'failed', e.message)
    }
  }

  const generateShot = async () => {
    setShotStatus(shot.id, 'generating')
    try {
      const res = await fetch('/api/film/shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId, shotId: shot.id, shot, previousShot }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Shot failed')
      const { videoUrl } = await res.json()
      updateShot(shot.id, { videoUrl, status: 'ready' })
    } catch (e: any) {
      setShotStatus(shot.id, 'failed', e.message)
    }
  }

  return (
    <div className="bg-off-white border border-ink/10 rounded-card overflow-hidden">
      <div className="flex items-stretch">
        {/* INDEX RAIL */}
        <div className="flex flex-col items-center justify-between bg-ink text-white px-3 py-4 w-14">
          <span className="font-mono text-[10px] tracking-widest text-yellow">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex flex-col gap-1">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="text-white/40 hover:text-yellow disabled:opacity-20 text-xs"
              aria-label="Move up"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="text-white/40 hover:text-yellow disabled:opacity-20 text-xs"
              aria-label="Move down"
            >
              ▼
            </button>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="w-[120px] sm:w-[160px] aspect-[9/16] bg-ink/5 relative shrink-0">
          {shot.videoUrl ? (
            <video
              src={shot.videoUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
              muted
            />
          ) : shot.keyframeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.keyframeUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink/30 font-mono text-[9px] uppercase tracking-widest p-2 text-center">
              No keyframe
            </div>
          )}
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider ${STATUS_COLORS[shot.status]}`}
          >
            {shot.status}
          </span>
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col p-4 gap-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="font-barlow font-bold text-ink text-lg uppercase leading-none">
                {shot.type}
              </span>
              <span className="font-mono text-[9px] uppercase text-muted">
                · {shot.duration}s · {shot.camera.motion} · {shot.camera.lens}
              </span>
              <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full border border-ink/20 text-ink">
                {shot.preferredEngine}
              </span>
              {previousShot?.videoUrl &&
                shot.type !== 'establishing' &&
                previousShot.continuity.location === shot.continuity.location &&
                previousShot.continuity.timeOfDay === shot.continuity.timeOfDay && (
                  <span
                    title="Will chain from previous shot's last frame"
                    className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-yellow/40 text-ink"
                  >
                    ⛓ chained
                  </span>
                )}
            </div>
            <button
              onClick={() => removeShot(shot.id)}
              className="text-ink/30 hover:text-red-500 text-sm"
              aria-label="Remove shot"
            >
              ✕
            </button>
          </div>

          {/* PROMPT */}
          {editingPrompt ? (
            <textarea
              value={shot.prompt}
              onChange={(e) => updateShot(shot.id, { prompt: e.target.value })}
              onBlur={() => setEditingPrompt(false)}
              autoFocus
              className="font-dm text-sm text-ink bg-white border border-ink/20 rounded p-2 min-h-[80px]"
            />
          ) : (
            <p
              onClick={() => setEditingPrompt(true)}
              className="font-dm text-sm text-ink/80 cursor-text hover:bg-ink/[0.02] rounded p-2 -m-2"
            >
              {shot.prompt}
            </p>
          )}

          {/* CONTINUITY */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase text-muted">
            <span>📍 {shot.continuity.location}</span>
            <span>🕐 {shot.continuity.timeOfDay}</span>
            {shot.continuity.charactersPresent.length > 0 && (
              <span>👤 {shot.continuity.charactersPresent.join(', ')}</span>
            )}
          </div>

          {expanded && (
            <div className="flex flex-col gap-2 pt-2 border-t border-ink/10">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted">
                Voiceover
              </label>
              <input
                type="text"
                value={shot.audio.vo || ''}
                onChange={(e) =>
                  updateShot(shot.id, { audio: { ...shot.audio, vo: e.target.value } })
                }
                placeholder="Optional narration line"
                className="font-dm text-sm text-ink bg-white border border-ink/20 rounded p-2"
              />
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted mt-1">
                Engine
              </label>
              <div className="flex gap-2">
                {(['veo', 'kling'] as const).map((eng) => (
                  <button
                    key={eng}
                    onClick={() => updateShot(shot.id, { preferredEngine: eng })}
                    className={`px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-wider border ${
                      shot.preferredEngine === eng
                        ? 'bg-ink text-yellow border-ink'
                        : 'border-ink/20 text-ink hover:border-ink'
                    }`}
                  >
                    {eng}
                  </button>
                ))}
              </div>
            </div>
          )}

          {shot.error && (
            <p className="font-mono text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded">
              {shot.error}
            </p>
          )}

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              onClick={generateKeyframe}
              disabled={shot.status === 'keyframing' || shot.status === 'generating'}
              className="bg-ink text-yellow font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-full hover:bg-ink/90 disabled:opacity-50"
            >
              {shot.keyframeUrl ? 'Regen Keyframe' : 'Make Keyframe'}
            </button>
            <button
              onClick={generateShot}
              disabled={!shot.keyframeUrl || shot.status === 'generating'}
              className="bg-yellow text-ink font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-full hover:bg-[#c8dc38] disabled:opacity-40"
            >
              {shot.videoUrl ? 'Regenerate Shot' : 'Generate Shot'}
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
            >
              {expanded ? 'Less' : 'More'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
