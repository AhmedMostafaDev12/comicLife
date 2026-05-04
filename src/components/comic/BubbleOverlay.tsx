'use client'

import { useRef, useCallback } from 'react'
import { Bubble } from '@/types'

interface BubbleOverlayProps {
  bubbles: Bubble[]
  editable?: boolean
  onUpdate?: (bubbles: Bubble[]) => void
}

export default function BubbleOverlay({ bubbles, editable, onUpdate }: BubbleOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Track which bubble index is being dragged, plus the offset from its center
  const dragRef = useRef<{ index: number; offsetX: number; offsetY: number } | null>(null)

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100)),
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (!editable || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()

    // Calculate offset from bubble center so it doesn't jump
    const rect = containerRef.current.getBoundingClientRect()
    const currentX = (bubbles[index].x / 100) * rect.width + rect.left
    const currentY = (bubbles[index].y / 100) * rect.height + rect.top
    dragRef.current = {
      index,
      offsetX: e.clientX - currentX,
      offsetY: e.clientY - currentY,
    }

    // Capture pointer on THIS element so move/up fire on it even outside bounds
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [editable, bubbles])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !containerRef.current || !onUpdate) return
    const { index, offsetX, offsetY } = dragRef.current
    const pos = toPercent(e.clientX - offsetX, e.clientY - offsetY)
    const updated = [...bubbles]
    updated[index] = { ...updated[index], x: pos.x, y: pos.y }
    onUpdate(updated)
  }, [bubbles, onUpdate, toPercent])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  if (!bubbles || bubbles.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      {bubbles.map((bubble, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: editable ? 'grab' : 'default',
            userSelect: 'none',
            maxWidth: '55%',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
          onPointerDown={(e) => handlePointerDown(e, i)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {bubble.type === 'speech' && <SpeechBubble text={bubble.text} />}
          {bubble.type === 'thought' && <ThoughtBubble text={bubble.text} />}
          {bubble.type === 'narration' && <NarrationBox text={bubble.text} />}
        </div>
      ))}
    </div>
  )
}

function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative" dir="auto">
      <div className="bg-white border-2 border-ink rounded-2xl px-3 py-2 shadow-sm">
        <p
          className="font-barlow font-bold text-[11px] sm:text-[13px] leading-tight text-ink"
          style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
        >
          {text}
        </p>
      </div>
      {/* Tail pointing down */}
      <div className="absolute -bottom-2 left-5 w-3 h-3 bg-white border-r-2 border-b-2 border-ink transform rotate-45" />
    </div>
  )
}

function ThoughtBubble({ text }: { text: string }) {
  return (
    <div className="relative" dir="auto">
      <div className="bg-white/90 border-2 border-ink rounded-full px-4 py-2 shadow-sm"
        style={{ borderRadius: '50% / 40%' }}
      >
        <p
          className="font-barlow font-bold text-[11px] sm:text-[13px] leading-tight text-ink italic"
          style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
        >
          {text}
        </p>
      </div>
      {/* Cloud dots */}
      <div className="absolute -bottom-1.5 left-4 w-2.5 h-2.5 bg-white border border-ink rounded-full" />
      <div className="absolute -bottom-3.5 left-2 w-1.5 h-1.5 bg-white border border-ink rounded-full" />
    </div>
  )
}

function NarrationBox({ text }: { text: string }) {
  return (
    <div dir="auto">
      <div className="bg-amber-50 border-[1.5px] border-ink px-3 py-1.5 shadow-md">
        <p
          className="font-barlow font-bold text-[10px] sm:text-[12px] leading-tight text-ink uppercase tracking-tight"
          style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
