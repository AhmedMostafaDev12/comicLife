'use client'

import { Panel } from '@/types'
import BubbleOverlay from './BubbleOverlay'

interface ComicPanelProps {
  panel: Panel
  editable?: boolean
  index: number
  onUpdate?: (id: string, updates: Partial<Panel>) => void
  onRegenerate?: (id: string) => void
}

export default function ComicPanel({ panel, editable, index, onUpdate, onRegenerate }: ComicPanelProps) {
  return (
    <div className="relative w-full rounded-[8px] overflow-hidden border border-white/10 bg-ink/10 flex flex-col group">
      {/* Image Area */}
      <div className="aspect-[4/3] bg-ink/20 relative w-full">
        {panel.image_url ? (
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

        {/* Overlay Controls — bottom strip so bubbles stay draggable */}
        {editable && (
          <div className="absolute bottom-0 left-0 right-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 py-2 z-20">
            <button
              onClick={() => onRegenerate && onRegenerate(panel.id)}
              className="bg-ink text-white font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full border border-white/20 hover:bg-white hover:text-ink transition"
            >
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Fallback: show caption below only if no bubbles exist */}
      {!panel.bubbles?.length && !panel.speech_bubble && panel.caption && (
        <div className="bg-white border-t-2 border-ink px-3 py-2" dir="auto">
          <p
            className="font-barlow font-bold text-[13px] leading-tight text-ink uppercase tracking-tight"
            style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
          >
            {panel.caption}
          </p>
        </div>
      )}
    </div>
  )
}
