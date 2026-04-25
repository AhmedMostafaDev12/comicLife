'use client'

import { Panel, Bubble } from '../../types'
import { useState } from 'react'
import BubbleOverlay from './BubbleOverlay'

interface ComicPanelProps {
  panel: Panel
  editable?: boolean
  index: number
  onUpdate?: (id: string, updates: Partial<Panel>) => void
  onRegenerate?: (id: string) => void
}

export default function ComicPanel({ panel, editable, index, onUpdate, onRegenerate }: ComicPanelProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [caption, setCaption] = useState(panel.caption)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleBlur = () => {
    setIsEditingCaption(false)
    if (onUpdate && caption !== panel.caption) {
      onUpdate(panel.id, { caption })
    }
  }

  const handleAnimate = async () => {
    if (isAnimating) return
    setIsAnimating(true)
    try {
      const res = await fetch('/api/animate-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelId: panel.id })
      })
      const data = await res.json()
      if (data.videoUrl && onUpdate) {
        onUpdate(panel.id, { video_url: data.videoUrl })
      } else if (data.error) {
        alert(`Animation error: ${data.error}`)
      }
    } catch (err) {
      console.error("Animation failed:", err)
    } finally {
      setIsAnimating(false)
    }
  }

  return (
    <div className="relative w-full rounded-[8px] overflow-hidden border border-white/10 bg-ink/10 flex flex-col group">
      {/* Image Area */}
      <div className="aspect-[4/3] bg-ink/20 relative w-full">
        {panel.video_url ? (
          <video
            src={panel.video_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : panel.image_url ? (
          <img src={panel.image_url} alt={`Panel ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-barlow text-6xl text-white/10 font-bold">
            {index + 1}
          </div>
        )}

        {/* Comic Bubbles (speech, thought, narration) */}
        <BubbleOverlay
          bubbles={panel.bubbles || (panel.speech_bubble ? [{ type: 'speech', text: panel.speech_bubble, x: 25, y: 80 }] : [])}
          editable={editable}
          onUpdate={(bubbles) => onUpdate && onUpdate(panel.id, { bubbles })}
        />

        {/* Animation Loading Overlay */}
        {isAnimating && (
          <div className="absolute inset-0 bg-ink/80 flex flex-col items-center justify-center gap-4 z-30">
            <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-white text-[10px] uppercase tracking-widest animate-pulse text-center px-4">
              Animating with Veo 3.1... This takes ~1-2 mins
            </span>
          </div>
        )}

        {/* Overlay Controls — bottom strip so bubbles stay draggable */}
        {editable && !isAnimating && (
          <div className="absolute bottom-0 left-0 right-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 py-2 z-20">
            <button
              onClick={() => onRegenerate && onRegenerate(panel.id)}
              className="bg-ink text-white font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full border border-white/20 hover:bg-white hover:text-ink transition"
            >
              Regenerate
            </button>
            <button
              onClick={handleAnimate}
              className="bg-yellow text-ink font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full border border-ink hover:bg-white transition"
            >
              Animate
            </button>
          </div>
        )}
      </div>

      {/* Fallback: show caption below only if no bubbles exist */}
      {!panel.bubbles?.length && !panel.speech_bubble && panel.caption && (
        <div className="bg-white border-t-2 border-ink px-3 py-2" dir="auto">
          <p
            onClick={() => editable && setIsEditingCaption(true)}
            className="font-barlow font-bold text-[13px] leading-tight text-ink uppercase tracking-tight cursor-pointer hover:text-yellow transition-colors"
            style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
          >
            {panel.caption}
          </p>
        </div>
      )}
    </div>
  )
}
