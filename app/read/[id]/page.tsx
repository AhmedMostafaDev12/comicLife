'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseClient } from '../../../lib/supabase'
import { Comic, Panel } from '../../../types'

export default function ComicReader() {
  const { id } = useParams()
  const [comic, setComic] = useState<Comic | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const supabase = createSupabaseClient()

  useEffect(() => {
    async function fetchComic() {
      try {
        setLoading(true)
        const { data: comicData, error: comicError } = await supabase
          .from('comics')
          .select('*')
          .eq('id', id)
          .single()

        if (comicError) throw comicError
        setComic(comicData)

        const { data: panelsData, error: panelsError } = await supabase
          .from('panels')
          .select('*')
          .eq('comic_id', id)
          .order('panel_index', { ascending: true })

        if (panelsError) throw panelsError
        
        setPanels(panelsData.map(p => ({
          id: p.id,
          order: p.panel_index,
          caption: p.caption,
          image_url: p.image_url,
          prompt_used: p.prompt,
          style: comicData.style,
          speech_bubble: p.speech_bubble
        })))

      } catch (err: any) {
        console.error('Error fetching comic:', err)
        setError(err.message || 'Failed to load comic')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchComic()
  }, [id, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-white text-[11px] uppercase tracking-widest">Opening memory...</p>
      </div>
    )
  }

  if (error || !comic) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-barlow font-black text-4xl text-white uppercase tracking-tight">404 — NOT FOUND</h1>
        <Link href="/dashboard" className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase px-8 py-3 rounded-full hover:bg-[#c8dc38] transition">
          BACK TO DASHBOARD
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink text-white relative font-dm selection:bg-yellow selection:text-ink">
      
      {/* FLOATING NAV / CLOSE BUTTON */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[60]">
        <Link 
          href="/dashboard"
          className="bg-white text-ink font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-yellow transition shadow-2xl border border-white/20"
        >
          CLOSE ×
        </Link>
      </div>

      {/* COMIC CONTENT */}
      <main className="max-w-[1000px] mx-auto py-20 sm:py-24 px-4 sm:px-6">
        
        {/* COMIC HEADER */}
        <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto px-2">
          <h1 className="font-barlow font-black text-4xl sm:text-6xl uppercase tracking-tight text-white mb-4 sm:mb-6 leading-[0.95]">
            {comic.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3">
             <span className="bg-yellow text-ink px-3 py-1 rounded-full font-mono text-[9px] sm:text-[10px] uppercase font-bold">
                {comic.style}
             </span>
             <span className="text-white/30 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest">
                {new Date(comic.created_at).toLocaleDateString()}
             </span>
          </div>
        </div>

        {/* COMIC GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white/5 p-3 sm:p-4 rounded-card border border-white/10">
          {panels.map((panel, i) => {
            const isWide = i % 3 === 0
            return (
              <div 
                key={panel.id} 
                className={`${isWide ? 'md:col-span-2' : 'md:col-span-1'} relative group overflow-hidden rounded-[8px] border border-white/10 aspect-[16/10] md:aspect-auto`}
              >
                {/* Image */}
                <div className="w-full h-full relative">
                  <img 
                    src={panel.image_url} 
                    alt={`Panel ${i + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Caption Box (Overlay) */}
                {panel.caption && (
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 max-w-[85%] sm:max-w-[80%]">
                    <div className="bg-white border-[1.5px] sm:border-2 border-ink p-2 sm:p-3 shadow-lg inline-block" dir="auto">
                      <p 
                        className="font-barlow font-bold text-[13px] sm:text-[15px] leading-tight text-ink uppercase tracking-tight"
                        style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
                      >
                        {panel.caption}
                      </p>
                    </div>
                  </div>
                )}

                {/* Speech Bubble */}
                {panel.speech_bubble && (
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-[70%] sm:max-w-[60%] bg-white border-2 border-ink rounded-full px-4 py-2 sm:px-5 sm:py-2.5 shadow-xl z-10" dir="auto">
                    <p 
                      className="font-barlow font-bold text-[14px] sm:text-[16px] leading-tight text-ink"
                      style={{ fontFamily: 'var(--font-arabic), "Barlow Condensed", sans-serif' }}
                    >
                      {panel.speech_bubble}
                    </p>
                    <div className="absolute -top-2 right-6 w-4 h-4 sm:w-5 sm:h-5 bg-white border-l-2 border-t-2 border-ink transform rotate-45 translate-y-[-50%]" />
                  </div>
                )}

              </div>
            )
          })}
        </div>

        <div className="text-center mt-16 sm:mt-20 pb-32">
          <div className="inline-block px-6 py-2 border border-white/10 rounded-full">
            <p className="font-mono text-[9px] sm:text-[10px] text-white/30 uppercase tracking-[0.2em]">The End</p>
          </div>
        </div>
      </main>

      {/* MUSIC PLAYER BAR */}
      {comic.soundtrack_url && (
        <div className="fixed bottom-0 left-0 right-0 h-16 sm:h-20 bg-ink/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 sm:px-8 z-50">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-yellow rounded-[8px] flex items-center justify-center text-ink shrink-0">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-dm text-[12px] sm:text-[14px] font-bold text-white leading-tight truncate">Memory Soundtrack</span>
              <span className="font-mono text-[8px] sm:text-[9px] text-white/40 uppercase tracking-wider truncate">Atmospheric Ambience</span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8 shrink-0">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg shadow-yellow/20"
            >
              {isPlaying ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-ink ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-ink ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            <div className="hidden md:flex items-center gap-3 w-[150px] lg:w-[250px]">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-yellow rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
