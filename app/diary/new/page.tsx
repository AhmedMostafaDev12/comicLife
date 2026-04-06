'use client'

import { useState } from 'react'
import DiaryEditor from '../../../components/diary/DiaryEditor'
import StylePicker from '../../../components/diary/StylePicker'
import ComicGrid from '../../../components/comic/ComicGrid'
import { useComicStore } from '../../../store/useComicStore'

export default function NewDiaryPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [diaryContent, setDiaryContent] = useState('')
  
  const { selectedStyle, panels } = useComicStore()

  const handleGenerate = () => {
    setStep(3)
    // Mock API call simulation
    setTimeout(() => {
      setStep(4)
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-8 md:px-9 md:py-12">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row gap-8">
        
        {/* LEFT COLUMN - 55% */}
        <div className="w-full md:w-[55%] flex flex-col gap-8">
          
          {/* STEP INDICATOR */}
          <div className="flex bg-ink p-1.5 rounded-full w-fit">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className={`px-5 py-2 rounded-full font-mono text-[10px] tracking-wider uppercase transition-colors ${
                  step === s ? 'bg-yellow text-ink font-bold' : 'text-white/50'
                }`}
              >
                0{s} {s === 1 ? 'WRITE' : s === 2 ? 'STYLE' : s === 3 ? 'GENERATE' : 'EDIT'}
              </div>
            ))}
          </div>

          {/* STEP 1: WRITE */}
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-4xl uppercase tracking-tight text-ink mb-2">
                  WRITE YOUR STORY
                </h1>
                <p className="font-dm text-muted">A memory, a feeling, a moment. Raw honesty works best.</p>
              </div>
              <DiaryEditor content={diaryContent} onChange={setDiaryContent} />
              <div className="flex justify-end">
                <button 
                  onClick={() => setStep(2)}
                  disabled={diaryContent.trim().length < 10}
                  className="bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-8 py-3.5 rounded-full transition hover:bg-[#c8dc38]"
                >
                  NEXT: CHOOSE STYLE →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STYLE PICKER */}
          {step === 2 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-4xl uppercase tracking-tight text-ink mb-2">
                  CHOOSE YOUR STYLE
                </h1>
                <p className="font-dm text-muted">Select the visual aesthetic for your comic.</p>
              </div>
              <StylePicker selected={selectedStyle} onChange={() => {}} />
              <div className="flex justify-between">
                <button 
                  onClick={() => setStep(1)}
                  className="border border-ink/20 text-ink font-mono text-[11px] tracking-[.08em] uppercase px-8 py-3.5 rounded-full transition hover:border-ink"
                >
                  ← BACK
                </button>
                <button 
                  onClick={handleGenerate}
                  className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-8 py-3.5 rounded-full transition hover:bg-[#c8dc38]"
                >
                  NEXT: GENERATE →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: GENERATE / EDIT */}
          {(step === 3 || step === 4) && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-4xl uppercase tracking-tight text-ink mb-2">
                  {step === 3 ? 'GENERATING PANELS' : 'EDIT PANELS'}
                </h1>
              </div>
              
              {step === 3 ? (
                <div className="bg-ink rounded-card p-12 flex flex-col items-center justify-center gap-6 min-h-[400px]">
                  <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-white text-[11px] uppercase tracking-wider">
                    Extracting scenes... 2/6 panels complete
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="font-dm text-muted mb-4">Click any panel to edit its caption or regenerate the image.</p>
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

        {/* RIGHT COLUMN - 45% STICKY */}
        <div className="w-full md:w-[45%]">
          <div className="sticky top-20 flex flex-col gap-6">
            
            <div className="bg-ink rounded-card p-6 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-white text-[11px] uppercase tracking-wider">PREVIEW</h2>
                <span className="bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase">
                  {selectedStyle}
                </span>
              </div>
              
              <div className="flex-1 border border-white/10 rounded-[8px] p-2 bg-ink/50 overflow-y-auto">
                {panels.length > 0 ? (
                  <ComicGrid panels={panels} editable={false} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-mono text-[10px] uppercase tracking-wider">Your comic will appear here</span>
                  </div>
                )}
              </div>

              {/* MUSIC ATTACHMENT WIDGET (Mock) */}
              <div className="mt-6 border border-white/10 rounded-[10px] p-4 bg-white/5">
                <span className="block font-mono text-[9px] uppercase text-white/50 mb-3">🎵 SOUNDTRACK</span>
                <input 
                  type="text" 
                  placeholder="Search for a song..." 
                  className="w-full bg-white text-ink rounded-full px-4 py-2 font-dm text-[13px] outline-none placeholder:text-ink/40"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button className="w-full border border-white/20 text-white font-mono text-[11px] tracking-wider uppercase py-3 rounded-full hover:bg-white hover:text-ink transition">
                  SAVE DRAFT
                </button>
                <button className="w-full bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3 rounded-full hover:bg-[#c8dc38] transition">
                  PUBLISH COMIC
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}
