'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import DiaryEditor from '../../../components/diary/DiaryEditor'
import StylePicker from '../../../components/diary/StylePicker'
import ComicGrid from '../../../components/comic/ComicGrid'
import VoiceRecorder from '../../../components/diary/VoiceRecorder'
import { useComicStore } from '../../../store/useComicStore'
import { ArtStyle } from '../../../types'
import { createSupabaseClient } from '../../../lib/supabase'

export default function NewDiaryPage() {
  const {
    currentStep,
    story,
    selectedStyle,
    panels,
    editingComicId,
    setStep,
    setStory,
    setStyle,
    setPanels,
    setEditingComicId,
    setGenerating,
  } = useComicStore()

  const [isPublishing, setIsPublishing] = useState(false)
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([])
  const [selectedCharIds, setSelectedCharacterIds] = useState<string[]>([])
  const [loadingEdit, setLoadingEdit] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()

  const editId = searchParams.get('edit')

  useEffect(() => {
    if (!editId) return
    if (editingComicId === editId) return

    async function loadComic() {
      setLoadingEdit(true)
      try {
        const { data: comic } = await supabase.from('comics').select('*').eq('id', editId).single()
        if (!comic) return

        const { data: panelsData } = await supabase
          .from('panels')
          .select('*')
          .eq('comic_id', editId)
          .order('panel_index', { ascending: true })

        setStory(comic.story || '')
        setStyle(comic.style as ArtStyle)
        setEditingComicId(editId!)
        setPanels((panelsData || []).map((p: any) => ({
          id: p.id,
          order: p.panel_index,
          caption: p.caption,
          image_url: p.image_url,
          prompt_used: p.prompt,
          style: comic.style,
          speech_bubble: p.speech_bubble,
          bubbles: p.bubbles,
        })))
        setStep(4)
      } catch (err) {
        console.error('Failed to load comic for editing:', err)
      } finally {
        setLoadingEdit(false)
      }
    }
    loadComic()
  }, [editId])

  useEffect(() => {
    async function fetchCast() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('characters').select('*').eq('user_id', user.id)
        setAvailableCharacters(data || [])
      }
    }
    fetchCast()
  }, [supabase])

  const handleGenerate = async () => {
    setStep(3)
    setGenerating(true)
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          story, 
          style: selectedStyle,
          selectedCharacterIds: selectedCharIds
        })
      })
      
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Generation failed')
      }
      
      const data = await response.json()
      setPanels(data.panels)
      setStep(4)
    } catch (error: any) {
      console.error(error)
      alert(`Generation Error: ${error.message}`)
      setStep(2) // Go back to setup so they can try again or change style
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (panels.length === 0) return
    setIsPublishing(true)
    try {
      const isEditing = !!editingComicId
      const url = isEditing ? '/api/update-comic' : '/api/save-comic'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comicId: editingComicId || undefined,
          story,
          style: selectedStyle,
          panels,
          title: story.replace(/<[^>]*>/g, '').slice(0, 30) + '...',
          soundtrackUrl: null
        })
      })
      if (!response.ok) throw new Error('Publish failed')
      const data = await response.json()
      setEditingComicId(null)
      router.push(`/read/${data.comicId}`)
    } catch (error: any) {
      alert(`Failed to publish: ${error.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleTranscript = (text: string) => {
    // Append to story if it's not empty, otherwise set it
    const newStory = story.trim() 
      ? `${story}<p>${text}</p>`
      : `<p>${text}</p>`
    setStory(newStory)
  }

  if (loadingEdit) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 mt-[64px]">
        <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-ink text-[11px] uppercase tracking-widest">Loading comic for editing...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 md:px-9 md:py-12 mt-[64px]">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-[55%] flex flex-col gap-8">
          
          <div className="flex bg-ink p-1.5 rounded-full w-full overflow-x-auto no-scrollbar">
            <div className="flex shrink-0 min-w-full justify-between sm:justify-start">
              {[1, 2, 3, 4].map((s) => (
                <button 
                  key={s}
                  onClick={() => currentStep > s && setStep(s as any)}
                  className={`px-4 sm:px-6 py-2 rounded-full font-mono text-[9px] sm:text-[10px] tracking-wider uppercase transition-colors ${
                    currentStep === s ? 'bg-yellow text-ink font-bold' : currentStep > s ? 'text-white hover:text-yellow' : 'text-white/30 cursor-not-allowed'
                  }`}
                >
                  0{s} {s === 1 ? 'WRITE' : s === 2 ? 'CAST & STYLE' : s === 3 ? 'GENERATE' : 'EDIT'}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1: WRITE */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-barlow font-black text-3xl sm:text-4xl uppercase tracking-tight text-ink mb-2">WRITE YOUR STORY</h1>
                  <p className="font-dm text-muted text-sm">A memory, a feeling, a moment.</p>
                </div>
                <VoiceRecorder onTranscript={handleTranscript} />
              </div>
              <DiaryEditor content={story} onChange={setStory} />
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                <button 
                  onClick={() => setStep(2)}
                  disabled={story.trim().split(/\s+/).filter(Boolean).length < 50}
                  className="w-full sm:w-auto bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold uppercase px-8 py-4 rounded-full transition hover:bg-[#c8dc38]"
                >
                  NEXT: SELECT CAST & STYLE →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CAST & STYLE */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h1 className="font-barlow font-black text-3xl sm:text-4xl uppercase tracking-tight text-ink mb-2">THE SETUP</h1>
                <p className="font-dm text-muted text-sm">Who's in this story and how should it look?</p>
              </div>

              {/* CAST PICKER */}
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[10px] uppercase text-ink/40 tracking-widest">Select Involved Characters</h3>
                <div className="flex flex-wrap gap-3">
                  {availableCharacters.length === 0 ? (
                    <Link href="/profile" className="text-ink/40 font-dm text-sm italic hover:text-yellow transition-colors underline">
                      + Add characters in your Profile first
                    </Link>
                  ) : (
                    availableCharacters.map(char => (
                      <button 
                        key={char.id}
                        onClick={() => toggleCharacter(char.id)}
                        className={`px-5 py-3 rounded-[12px] border-2 transition-all flex flex-col gap-1 text-left ${
                          selectedCharIds.includes(char.id) ? 'border-yellow bg-yellow/5' : 'border-ink/5 bg-white'
                        }`}
                      >
                        <span className="font-barlow font-bold text-lg uppercase leading-none">{char.name}</span>
                        <span className="font-dm text-[10px] text-muted truncate w-24">{char.description}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[10px] uppercase text-ink/40 tracking-widest">Select Visual Style</h3>
                <StylePicker selected={selectedStyle} onChange={(s) => setStyle(s as ArtStyle)} />
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
                <button onClick={() => setStep(1)} className="order-2 sm:order-1 border border-ink/20 text-ink font-mono text-[11px] uppercase px-8 py-4 rounded-full transition hover:border-ink">← BACK</button>
                <button onClick={handleGenerate} className="order-1 sm:order-2 bg-yellow text-ink font-mono text-[11px] font-bold uppercase px-8 py-4 rounded-full transition hover:bg-[#c8dc38]">NEXT: GENERATE →</button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4 */}
          {(currentStep === 3 || currentStep === 4) && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <h1 className="font-barlow font-black text-3xl sm:text-4xl uppercase tracking-tight text-ink mb-2">
                {currentStep === 3 ? 'GENERATING PANELS' : 'EDIT PANELS'}
              </h1>
              {currentStep === 3 ? (
                <div className="bg-ink rounded-card p-12 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                  <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-white text-[11px] uppercase tracking-widest animate-pulse">Designing your story with the cast...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <ComicGrid panels={panels} editable={true} />
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
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-mono text-[10px] uppercase tracking-wider">Your comic will appear here</span>
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={handlePublish} disabled={isPublishing || panels.length === 0} className="w-full bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-4 rounded-full hover:bg-[#c8dc38] transition">
                  {isPublishing ? 'SAVING...' : editingComicId ? 'UPDATE COMIC' : 'PUBLISH COMIC'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
