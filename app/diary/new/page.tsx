'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DiaryEditor from '../../../components/diary/DiaryEditor'
import StylePicker from '../../../components/diary/StylePicker'
import ComicGrid from '../../../components/comic/ComicGrid'
import { useComicStore } from '../../../store/useComicStore'
import { ArtStyle } from '../../../types'

export default function NewDiaryPage() {
  const { 
    currentStep, 
    story, 
    wordCount,
    selectedStyle, 
    panels, 
    isGenerating,
    setStep, 
    setStory,
    setWordCount,
    setStyle,
    setPanels,
    setGenerating,
    reset
  } = useComicStore()

  const [isPublishing, setIsPublishing] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    setStep(3)
    setGenerating(true)
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story, style: selectedStyle })
      })
      
      if (!response.ok) throw new Error('Generation failed')
      
      const data = await response.json()
      setPanels(data.panels)
      setStep(4)
    } catch (error) {
      console.error(error)
      setStep(4)
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (panels.length === 0) return
    
    setIsPublishing(true)
    try {
      const response = await fetch('/api/save-comic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story,
          style: selectedStyle,
          panels,
          title: story.slice(0, 30) + '...',
          soundtrackUrl: null
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Publish failed')
      }
      
      const data = await response.json()
      router.push(`/read/${data.comicId}`)
    } catch (error: any) {
      console.error('Error publishing comic:', error)
      alert(`Failed to publish comic: ${error.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 md:px-9 md:py-12 mt-[64px]">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        {/* LEFT COLUMN - Steps */}
        <div className="w-full lg:w-[55%] flex flex-col gap-8">
          
          {/* STEP INDICATOR - Scrollable on mobile */}
          <div className="flex bg-ink p-1.5 rounded-full w-full overflow-x-auto no-scrollbar">
            <div className="flex shrink-0 min-w-full justify-between sm:justify-start">
              {[1, 2, 3, 4].map((s) => (
                <button 
                  key={s}
                  onClick={() => currentStep > s && setStep(s as any)}
                  className={`px-4 sm:px-6 py-2 rounded-full font-mono text-[9px] sm:text-[10px] tracking-wider uppercase transition-colors whitespace-nowrap ${
                    currentStep === s 
                      ? 'bg-yellow text-ink font-bold' 
                      : currentStep > s 
                        ? 'text-white hover:text-yellow' 
                        : 'text-white/30 cursor-not-allowed'
                  }`}
                >
                  0{s} {s === 1 ? 'WRITE' : s === 2 ? 'STYLE' : s === 3 ? 'GENERATE' : 'EDIT'}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1: WRITE */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-3xl sm:text-4xl uppercase tracking-tight text-ink mb-2">
                  WRITE YOUR STORY
                </h1>
                <p className="font-dm text-muted text-sm">A memory, a feeling, a moment. Raw honesty works best.</p>
              </div>
              <DiaryEditor content={story} onChange={setStory} />
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                {story.trim().split(/\s+/).filter(Boolean).length < 50 && (
                  <p className="font-mono text-[9px] text-muted uppercase tracking-wider">
                    Write at least 50 words to continue
                  </p>
                )}
                <button 
                  onClick={() => setStep(2)}
                  disabled={story.trim().split(/\s+/).filter(Boolean).length < 50}
                  className="w-full sm:w-auto bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-8 py-4 rounded-full transition hover:bg-[#c8dc38]"
                >
                  NEXT: CHOOSE STYLE →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STYLE PICKER */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-3xl sm:text-4xl uppercase tracking-tight text-ink mb-2">
                  CHOOSE YOUR STYLE
                </h1>
                <p className="font-dm text-muted text-sm">Select the visual aesthetic for your comic.</p>
              </div>
              <StylePicker selected={selectedStyle} onChange={(s) => setStyle(s as ArtStyle)} />
              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
                <button 
                  onClick={() => setStep(1)}
                  className="order-2 sm:order-1 border border-ink/20 text-ink font-mono text-[11px] tracking-[.08em] uppercase px-8 py-4 rounded-full transition hover:border-ink"
                >
                  ← BACK
                </button>
                <button 
                  onClick={handleGenerate}
                  className="order-1 sm:order-2 bg-yellow text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-8 py-4 rounded-full transition hover:bg-[#c8dc38]"
                >
                  NEXT: GENERATE →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: GENERATE / EDIT */}
          {(currentStep === 3 || currentStep === 4) && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-3xl sm:text-4xl uppercase tracking-tight text-ink mb-2">
                  {currentStep === 3 ? 'GENERATING PANELS' : 'EDIT PANELS'}
                </h1>
              </div>
              
              {currentStep === 3 ? (
                <div className="bg-ink rounded-card p-12 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                  <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="font-mono text-white text-[11px] uppercase tracking-widest mb-2 animate-pulse">
                      Parsing your story...
                    </p>
                    <p className="font-dm text-white/40 text-sm">
                      Our AI is imagining the scenes for your comic.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="font-dm text-muted text-sm mb-4">Click any panel to edit its caption or drag to reorder.</p>
                  <ComicGrid panels={panels} editable={true} />
                  <div className="mt-4 border-2 border-dashed border-ink/20 rounded-[8px] p-6 flex items-center justify-center cursor-pointer hover:border-yellow group transition-colors">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink/40 group-hover:text-yellow">
                      + ADD PANEL
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Sticky Preview */}
        <div className="w-full lg:w-[45%]">
          <div className="lg:sticky lg:top-24 flex flex-col gap-6">
            
            <div className="bg-ink rounded-card p-5 sm:p-6 lg:min-h-[600px] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-white text-[11px] uppercase tracking-wider">PREVIEW</h2>
                <span className="border border-yellow/40 text-yellow px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold">
                  {selectedStyle.startsWith('custom:') ? 'Custom Style' : selectedStyle}
                </span>
              </div>
              
              <div className="flex-1 border border-white/10 rounded-[8px] p-2 bg-ink/50 overflow-y-auto max-h-[400px] lg:max-h-none">
                {panels.length > 0 ? (
                  <ComicGrid panels={panels} editable={false} />
                ) : (
                  <div className="h-[300px] lg:h-full flex flex-col items-center justify-center gap-4 text-white/20">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-mono text-[10px] uppercase tracking-wider">Your comic will appear here</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-6 flex flex-col gap-3">
                <button className="w-full border border-white/20 text-white font-mono text-[11px] tracking-wider uppercase py-4 rounded-full hover:bg-white hover:text-ink transition">
                  SAVE DRAFT
                </button>
                <button 
                  onClick={handlePublish}
                  disabled={isPublishing || panels.length === 0}
                  className="w-full bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-4 rounded-full hover:bg-[#c8dc38] transition"
                >
                  {isPublishing ? 'PUBLISHING...' : 'PUBLISH COMIC'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}
