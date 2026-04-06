'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ComicReader() {
  const [isPlaying, setIsPlaying] = useState(false)

  // Mock comic panels for MVP
  const panels = [
    { id: '1', image: '', caption: 'The morning light was harsh, but clear.', speech: 'Wake up.' },
    { id: '2', image: '', caption: 'I poured my third coffee. It wasn’t helping.', speech: null },
    { id: '3', image: '', caption: 'Suddenly, a realization hit me like a train.', speech: 'I forgot the keys!' },
  ]

  return (
    <div className="min-h-screen bg-ink text-white relative font-dm selection:bg-yellow selection:text-ink">
      
      {/* FLOATING NAV / CLOSE BUTTON */}
      <div className="fixed top-6 right-6 z-50">
        <Link 
          href="/dashboard"
          className="bg-cream text-ink font-mono text-[10px] uppercase tracking-wider px-4 py-2 rounded-full hover:bg-white transition shadow-lg"
        >
          CLOSE ×
        </Link>
      </div>

      {/* COMIC CONTENT */}
      <main className="max-w-[720px] mx-auto py-24 px-4 flex flex-col gap-16">
        {panels.map((panel, i) => (
          <div key={panel.id} className="w-full flex flex-col items-center">
            <div className="w-full border border-white/10 rounded-[8px] overflow-hidden bg-white/5 relative">
              
              {/* Image Placeholder */}
              <div className="w-full aspect-[4/3] flex items-center justify-center bg-black/50">
                <span className="font-barlow font-black text-[120px] text-white/5">{i + 1}</span>
              </div>

              {/* Speech Bubble */}
              {panel.speech && (
                <div className="absolute top-6 left-6 max-w-[60%] bg-white border-2 border-ink rounded-[10px] p-4 shadow-xl z-10">
                  <p className="font-barlow font-bold text-[18px] leading-tight text-ink">
                    {panel.speech}
                  </p>
                  <div className="absolute -bottom-3 left-6 w-5 h-5 bg-white border-r-2 border-b-2 border-ink transform rotate-45 translate-y-[-50%]" />
                </div>
              )}

              {/* Caption */}
              <div className="bg-ink p-4 border-t border-white/10 w-full text-center">
                <p className="font-mono text-[13px] text-white/80 italic leading-relaxed">
                  &quot;{panel.caption}&quot;
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* PAGE NAVIGATION */}
        <div className="flex items-center justify-center gap-8 mt-12 pb-24">
          <button className="font-barlow font-bold text-2xl uppercase tracking-wider text-white/50 hover:text-yellow transition">
            ← PREV CHAPTER
          </button>
          <button className="font-barlow font-bold text-2xl uppercase tracking-wider text-white/50 hover:text-yellow transition">
            NEXT CHAPTER →
          </button>
        </div>
      </main>

      {/* MUSIC PLAYER BAR */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-ink/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-white/10 rounded-[6px]" />
          <div className="flex flex-col">
            <span className="font-dm text-[13px] font-bold text-white leading-tight">Midnight City</span>
            <span className="font-mono text-[10px] text-white/50">M83</span>
          </div>
        </div>

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-yellow flex items-center justify-center hover:scale-105 transition"
        >
          {isPlaying ? (
             <svg className="w-4 h-4 text-ink ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-4 h-4 text-ink ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <div className="flex items-center gap-3 w-[120px] md:w-[200px]">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-yellow rounded-full" />
          </div>
        </div>
      </div>

    </div>
  )
}
