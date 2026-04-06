'use client'

import { Panel } from '../../types'
import { useState } from 'react'

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

  const handleBlur = () => {
    setIsEditingCaption(false)
    if (onUpdate && caption !== panel.caption) {
      onUpdate(panel.id, { caption })
    }
  }

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

        {/* Primary Caption Box (White Box Overlay) */}
        {(panel.caption || isEditingCaption) && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <div 
              className="bg-white border-2 border-ink p-2.5 shadow-sm max-w-[85%] inline-block cursor-pointer hover:bg-yellow/5 transition-colors"
              onClick={() => editable && setIsEditingCaption(true)}
            >
              {isEditingCaption ? (
                <textarea
                  autoFocus
                  className="w-full bg-transparent text-ink font-barlow font-bold text-[14px] leading-tight outline-none resize-none"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onBlur={handleBlur}
                  rows={2}
                />
              ) : (
                <p className="font-barlow font-bold text-[14px] leading-tight text-ink uppercase tracking-tight">
                  {panel.caption}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Speech Bubble (Secondary, if exists) */}
        {panel.speech_bubble && (
          <div className="absolute bottom-4 left-4 max-w-[70%] bg-white border-2 border-ink rounded-full px-4 py-2 shadow-sm z-10">
            <p className="font-barlow font-bold text-[13px] leading-tight text-ink">
              {panel.speech_bubble}
            </p>
            <div className="absolute -bottom-2 left-4 w-3 h-3 bg-white border-r-2 border-b-2 border-ink transform rotate-45 translate-y-[-50%]" />
          </div>
        )}

        {/* Overlay Controls */}
        {editable && (
          <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
            <button 
              onClick={() => onRegenerate && onRegenerate(panel.id)}
              className="bg-ink text-white font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full hover:bg-white hover:text-ink transition"
            >
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
