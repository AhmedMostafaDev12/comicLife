'use client'

import { Panel } from '../../types'

interface ComicPanelProps {
  panel: Panel
  editable?: boolean
  index: number
}

export default function ComicPanel({ panel, editable, index }: ComicPanelProps) {
  return (
    <div className="relative w-full rounded-[8px] overflow-hidden border border-white/20 bg-ink/10 flex flex-col group">
      {/* Image Area */}
      <div className="aspect-[4/3] bg-ink/20 relative w-full">
        {panel.image_url ? (
          <img src={panel.image_url} alt={`Panel ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-barlow text-6xl text-white/10 font-bold">
            {index + 1}
          </div>
        )}

        {/* Speech Bubble */}
        {panel.speech_bubble && (
          <div className="absolute top-4 left-4 max-w-[70%] bg-white border-2 border-ink rounded-[8px] p-3 shadow-sm z-10">
            <p className="font-barlow font-bold text-[15px] leading-tight text-ink">
              {panel.speech_bubble}
            </p>
            {/* Tail */}
            <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-r-2 border-b-2 border-ink transform rotate-45 translate-y-[-50%]" />
          </div>
        )}

        {/* Overlay Controls */}
        {editable && (
          <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button className="bg-ink text-white font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full hover:bg-white hover:text-ink transition">
              Regenerate
            </button>
            <button className="bg-yellow text-ink font-mono text-[10px] tracking-wider uppercase px-4 py-2 rounded-full hover:bg-[#c8dc38] transition">
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Caption Bar */}
      <div className="bg-ink p-3 w-full border-t border-white/20">
        <p className="font-mono text-[11px] text-white/90 italic leading-relaxed">
          {panel.caption || "Loading caption..."}
        </p>
      </div>
    </div>
  )
}
