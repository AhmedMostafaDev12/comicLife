'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Comic, Panel } from '@/types'
import BubbleOverlay from '@/components/comic/BubbleOverlay'
import { jsPDF } from 'jspdf'

type PageLayout = {
  panels: Panel[]
  layout: '1' | '2v' | '2h' | '3' | '4'
}

function buildPages(panels: Panel[]): PageLayout[] {
  const pages: PageLayout[] = []
  let i = 0
  const layouts: PageLayout['layout'][] = ['1', '2h', '3', '2h', '4', '1', '2h', '2h', '3']
  let layoutIdx = 0

  while (i < panels.length) {
    const remaining = panels.length - i
    let layout = layouts[layoutIdx % layouts.length]

    const panelCount = layout === '1' ? 1 : layout === '2v' || layout === '2h' ? 2 : layout === '3' ? 3 : 4
    if (remaining < panelCount) {
      if (remaining === 1) layout = '1'
      else if (remaining === 2) layout = '2h'
      else if (remaining === 3) layout = '3'
      else layout = '4'
    }

    const count = layout === '1' ? 1 : layout === '2v' || layout === '2h' ? 2 : layout === '3' ? 3 : 4
    pages.push({ panels: panels.slice(i, i + count), layout })
    i += count
    layoutIdx++
  }
  return pages
}

function PanelCell({ panel, index }: { panel: Panel; index: number }) {
  return (
    <div className="relative w-full h-full overflow-hidden group">
      {panel.image_url ? (
        <img
          src={panel.image_url}
          alt={`Panel ${index + 1}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full bg-ink/10 flex items-center justify-center">
          <span className="font-barlow text-4xl text-ink/10 font-bold">{index + 1}</span>
        </div>
      )}

      {/* Comic Bubbles */}
      <BubbleOverlay
        bubbles={panel.bubbles || (panel.speech_bubble
          ? [{ type: 'speech' as const, text: panel.speech_bubble, x: 75, y: 80 }]
          : panel.caption
            ? [{ type: 'narration' as const, text: panel.caption, x: 15, y: 10 }]
            : []
        )}
      />
    </div>
  )
}

function ComicPage({ page, startIndex }: { page: PageLayout; startIndex: number }) {
  const { panels, layout } = page

  if (layout === '1') {
    return (
      <div className="w-full h-full">
        <PanelCell panel={panels[0]} index={startIndex} />
      </div>
    )
  }

  if (layout === '2v') {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-[3px]">
        <PanelCell panel={panels[0]} index={startIndex} />
        <PanelCell panel={panels[1]} index={startIndex + 1} />
      </div>
    )
  }

  if (layout === '2h') {
    return (
      <div className="w-full h-full grid grid-rows-2 gap-[3px]">
        <PanelCell panel={panels[0]} index={startIndex} />
        <PanelCell panel={panels[1]} index={startIndex + 1} />
      </div>
    )
  }

  if (layout === '3') {
    return (
      <div className="w-full h-full grid grid-rows-2 gap-[3px]">
        <div className="w-full h-full">
          <PanelCell panel={panels[0]} index={startIndex} />
        </div>
        <div className="w-full h-full grid grid-cols-2 gap-[3px]">
          <PanelCell panel={panels[1]} index={startIndex + 1} />
          <PanelCell panel={panels[2]} index={startIndex + 2} />
        </div>
      </div>
    )
  }

  // layout === '4'
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[3px]">
      <PanelCell panel={panels[0]} index={startIndex} />
      <PanelCell panel={panels[1]} index={startIndex + 1} />
      <PanelCell panel={panels[2]} index={startIndex + 2} />
      <PanelCell panel={panels[3]} index={startIndex + 3} />
    </div>
  )
}

export default function ComicReader() {
  const { id } = useParams()
  const [comic, setComic] = useState<Comic | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null)
  const [isExporting, setIsExporting] = useState(false)

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
          speech_bubble: p.speech_bubble,
          bubbles: p.bubbles
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

  const pages = useMemo(() => buildPages(panels), [panels])
  const totalPages = pages.length + 2 // cover + content pages + end

  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setFlipDirection('next')
      setTimeout(() => {
        setCurrentPage(p => p + 1)
        setFlipDirection(null)
      }, 350)
    }
  }, [currentPage, totalPages])

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setFlipDirection('prev')
      setTimeout(() => {
        setCurrentPage(p => p - 1)
        setFlipDirection(null)
      }, 350)
    }
  }, [currentPage])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  const handleDownloadPDF = async () => {
    if (!comic || panels.length === 0 || isExporting) return
    setIsExporting(true)

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const PW = 210
      const PH = 297
      const edge = 0
      const CW = PW
      const CH = PH

      // Load image helper
      const loadImg = (url: string): Promise<{ d: string; w: number; h: number }> =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const c = document.createElement('canvas')
            c.width = img.naturalWidth; c.height = img.naturalHeight
            c.getContext('2d')!.drawImage(img, 0, 0)
            resolve({ d: c.toDataURL('image/jpeg', 0.92), w: img.naturalWidth, h: img.naturalHeight })
          }
          img.onerror = reject
          img.src = url
        })

      // Preload all
      type LP = Panel & { d?: string; ar?: number }
      const lp: LP[] = await Promise.all(panels.map(async p => {
        if (!p.image_url) return { ...p }
        try {
          const { d, w, h } = await loadImg(p.image_url)
          return { ...p, d, ar: w / h }
        } catch { return { ...p } }
      }))

      // Draw image cropped to fit a rect (like object-fit: cover) using canvas pre-crop
      const drawCover = async (dataUrl: string, ar: number, x: number, y: number, w: number, h: number) => {
        const slotAr = w / h

        // Pre-crop the image on a canvas so jsPDF only gets the visible portion
        const cropped = await new Promise<string>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const iw = img.naturalWidth
            const ih = img.naturalHeight
            let sx = 0, sy = 0, sw = iw, sh = ih
            if (ar > slotAr) {
              // image wider — crop sides
              sw = ih * slotAr
              sx = (iw - sw) / 2
            } else {
              // image taller — crop top/bottom
              sh = iw / slotAr
              sy = (ih - sh) / 2
            }
            const c = document.createElement('canvas')
            c.width = Math.round(sw)
            c.height = Math.round(sh)
            c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
            resolve(c.toDataURL('image/jpeg', 0.90))
          }
          img.src = dataUrl
        })

        pdf.addImage(cropped, 'JPEG', x, y, w, h)
      }

      // --- COVER PAGE ---
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, PW, PH, 'F')
      // Use first panel as cover background
      if (lp[0]?.d && lp[0]?.ar) {
        await drawCover(lp[0].d, lp[0].ar, 0, 0, PW, PH)
        // Dark overlay
        pdf.setFillColor(0, 0, 0)
        pdf.setGState(new (pdf as any).GState({ opacity: 0.55 }))
        pdf.rect(0, 0, PW, PH, 'F')
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }))
      }
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(32)
      const tl = pdf.splitTextToSize(comic.title.toUpperCase(), PW - 40)
      pdf.text(tl, PW / 2, PH / 2 - 15, { align: 'center' })
      pdf.setFontSize(9)
      pdf.setTextColor(200, 200, 200)
      pdf.text(
        `${comic.style.toUpperCase()}  ·  ${new Date(comic.created_at).toLocaleDateString()}`,
        PW / 2, PH / 2 + 15, { align: 'center' }
      )

      // --- COMIC PAGES ---
      // Use the exact same page groupings as the web reader
      const lpMap = new Map<string, LP>()
      lp.forEach(p => lpMap.set(p.id, p))

      // Layout rects [x%, y%, w%, h%] matching the web ComicPage layouts
      const layoutRects: Record<string, number[][]> = {
        '1':  [[0, 0, 100, 100]],
        '2v': [[0, 0, 100, 50], [0, 50, 100, 50]],
        '2h': [[0, 0, 100, 50], [0, 50, 100, 50]],
        '3':  [[0, 0, 100, 50], [0, 50, 50, 50], [50, 50, 50, 50]],
        '4':  [[0, 0, 50, 50], [50, 0, 50, 50], [0, 50, 50, 50], [50, 50, 50, 50]],
      }

      for (const page of pages) {
        pdf.addPage()
        pdf.setFillColor(20, 20, 20)
        pdf.rect(0, 0, PW, PH, 'F')

        const rects = layoutRects[page.layout] || layoutRects['1']

        for (let j = 0; j < page.panels.length && j < rects.length; j++) {
          const panel = page.panels[j]
          const p = lpMap.get(panel.id) || { ...panel } as LP
          const [xPct, yPct, wPct, hPct] = rects[j]
          const x = edge + (CW * xPct) / 100
          const y = edge + (CH * yPct) / 100
          const w = (CW * wPct) / 100
          const h = (CH * hPct) / 100

          if (p.d && p.ar) {
            await drawCover(p.d, p.ar, x, y, w, h)
          } else {
            pdf.setFillColor(40, 40, 40)
            pdf.rect(x, y, w, h, 'F')
          }

          // Render bubbles (new system) or fallback to old caption/speech_bubble
          const bubbles = p.bubbles || (p.speech_bubble
            ? [{ type: 'speech' as const, text: p.speech_bubble, x: 75, y: 80 }]
            : p.caption
              ? [{ type: 'narration' as const, text: p.caption, x: 15, y: 10 }]
              : [])

          for (const bub of bubbles) {
            pdf.setFontSize(bub.type === 'narration' ? 8 : 10)
            const bubMaxW = Math.min(w * 0.55, 60)
            const bubLines = pdf.splitTextToSize(bub.text, bubMaxW - 6)
            const lineH = bub.type === 'narration' ? 3.5 : 4.5
            const bubH = Math.max(10, bubLines.length * lineH + 5)
            const bubW = bubMaxW
            const bx = x + (w * bub.x) / 100 - bubW / 2
            const by = y + (h * bub.y) / 100 - bubH / 2

            if (bub.type === 'narration') {
              pdf.setFillColor(255, 251, 235) // amber-50
            } else {
              pdf.setFillColor(255, 255, 255)
            }
            const r = bub.type === 'thought' ? 6 : bub.type === 'narration' ? 1 : 4
            pdf.roundedRect(Math.max(x, bx), Math.max(y, by), bubW, bubH, r, r, 'F')
            pdf.setDrawColor(20, 20, 20)
            pdf.setLineWidth(0.5)
            pdf.roundedRect(Math.max(x, bx), Math.max(y, by), bubW, bubH, r, r, 'S')
            pdf.setTextColor(20, 20, 20)
            if (bub.type === 'thought') pdf.setFont('helvetica', 'italic')
            else if (bub.type === 'narration') pdf.setFont('helvetica', 'bold')
            else pdf.setFont('helvetica', 'bold')
            pdf.text(bubLines.slice(0, 4).join('\n'), Math.max(x, bx) + 3, Math.max(y, by) + 4.5)
            pdf.setFont('helvetica', 'normal')
          }
        }
      }

      // --- END PAGE ---
      pdf.addPage()
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, PW, PH, 'F')
      pdf.setTextColor(20, 20, 20)
      pdf.setFontSize(28)
      pdf.text('THE END', PW / 2, PH / 2, { align: 'center' })
      pdf.setFontSize(9)
      pdf.setTextColor(120, 120, 120)
      pdf.text(`${panels.length} panels`, PW / 2, PH / 2 + 14, { align: 'center' })

      const safeName = comic.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
      pdf.save(`${safeName}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export failed. Try again.')
    } finally {
      setIsExporting(false)
    }
  }

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

  const isCover = currentPage === 0
  const isEnd = currentPage === totalPages - 1
  const pageIndex = currentPage - 1

  const startPanelIndex = pageIndex >= 0 && pageIndex < pages.length
    ? pages.slice(0, pageIndex).reduce((sum, p) => sum + p.panels.length, 0)
    : 0

  const flipClass = flipDirection === 'next'
    ? 'animate-page-flip-next'
    : flipDirection === 'prev'
    ? 'animate-page-flip-prev'
    : ''

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white relative font-dm selection:bg-yellow selection:text-ink flex flex-col items-center justify-center overflow-hidden">

      <style jsx global>{`
        @keyframes pageFlipNext {
          0% { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
          100% { transform: perspective(1200px) rotateY(-90deg); opacity: 0; }
        }
        @keyframes pageFlipPrev {
          0% { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
          100% { transform: perspective(1200px) rotateY(90deg); opacity: 0; }
        }
        .animate-page-flip-next {
          animation: pageFlipNext 0.35s ease-in forwards;
          transform-origin: left center;
        }
        .animate-page-flip-prev {
          animation: pageFlipPrev 0.35s ease-in forwards;
          transform-origin: right center;
        }
      `}</style>

      {/* Top Nav */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[60] flex gap-2">
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="bg-white/10 text-white font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-white/20 disabled:opacity-50 transition shadow-2xl border border-white/10 backdrop-blur-sm"
        >
          {isExporting ? 'Exporting...' : 'PDF'}
        </button>
        <Link
          href={`/create?edit=${id}`}
          className="bg-white/10 text-white font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-white/20 transition shadow-2xl border border-white/10"
        >
          Edit
        </Link>
        <Link
          href="/dashboard"
          className="bg-white text-ink font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-yellow transition shadow-2xl border border-white/20"
        >
          CLOSE
        </Link>
      </div>

      {/* Page Counter */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[60]">
        <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
          {currentPage + 1} / {totalPages}
        </span>
      </div>

      {/* Book Container */}
      <div className="relative w-full max-w-[700px] mx-auto px-4 sm:px-6">
        <div
          className={`relative bg-[#f5f0e8] rounded-[4px] shadow-[0_20px_80px_rgba(0,0,0,0.6),_0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden ${flipClass}`}
          style={{
            aspectRatio: '3/4',
            backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 0%, transparent 3%, transparent 97%, rgba(0,0,0,0.03) 100%)',
          }}
        >
          {/* Book spine shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-gradient-to-r from-black/10 to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-l from-black/5 to-transparent z-20 pointer-events-none" />

          {/* --- COVER PAGE --- */}
          {isCover && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#f5f0e8]">
              {panels[0]?.image_url && (
                <div className="absolute inset-0 opacity-15">
                  <img src={panels[0].image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="w-16 h-[2px] bg-ink/20" />
                <h1
                  className="font-barlow font-black text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight text-ink leading-[0.95]"
                  dir="auto"
                >
                  {comic.title}
                </h1>
                <div className="w-16 h-[2px] bg-ink/20" />
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <span className="bg-ink text-[#f5f0e8] px-3 py-1 rounded-full font-mono text-[9px] sm:text-[10px] uppercase font-bold">
                    {comic.style}
                  </span>
                  <span className="text-ink/40 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest">
                    {new Date(comic.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-ink/30 uppercase tracking-[0.3em] mt-8">
                  Tap or press &rarr; to begin
                </p>
              </div>
            </div>
          )}

          {/* --- COMIC PAGES (multi-panel layouts) --- */}
          {!isCover && !isEnd && pages[pageIndex] && (
            <div className="absolute inset-0 bg-ink p-[3px]">
              <ComicPage page={pages[pageIndex]} startIndex={startPanelIndex} />
            </div>
          )}

          {/* --- END PAGE --- */}
          {isEnd && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#f5f0e8]">
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-[2px] bg-ink/20" />
                <p className="font-barlow font-black text-2xl sm:text-4xl uppercase tracking-tight text-ink">
                  The End
                </p>
                <div className="w-16 h-[2px] bg-ink/20" />
                <p className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.2em] mt-4">
                  {panels.length} panels &middot; {pages.length} pages
                </p>
                <Link
                  href="/dashboard"
                  className="mt-8 bg-ink text-[#f5f0e8] font-mono text-[10px] font-bold uppercase tracking-wider px-8 py-3 rounded-full hover:bg-yellow hover:text-ink transition"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Navigation below book */}
        <div className="flex items-center justify-between mt-6 px-2">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className="font-mono text-[11px] text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-widest transition px-4 py-2"
          >
            &larr; Prev
          </button>

          {/* Progress indicator */}
          {totalPages <= 16 ? (
            <div className="flex items-center gap-1.5 max-w-[60%] flex-wrap justify-center">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPage
                      ? 'bg-yellow scale-125'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 max-w-[50%] mx-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow rounded-full transition-all duration-300"
                  style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={goNext}
            disabled={currentPage === totalPages - 1}
            className="font-mono text-[11px] text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-widest transition px-4 py-2"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Music Player Bar */}
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
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg shadow-yellow/20 shrink-0"
          >
            {isPlaying ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-ink ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-ink ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
