'use client'

import { useState, useRef, useEffect } from 'react'
import { useSessionStore } from '../../store/useSessionStore'
import { createSupabaseClient } from '../../lib/supabase'

export default function AvatarCreator() {
  const [style, setStyle] = useState('painterly')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'done'>('idle')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null)
  const [baseDescription, setBaseDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseClient()
  
  const { setAvatar } = useSessionStore()

  // Fetch current description to maintain consistency
  useEffect(() => {
    async function fetchCurrentProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('character_description')
          .eq('id', user.id)
          .single()
        if (data) setBaseDescription(data.character_description || '')
      }
    }
    fetchCurrentProfile()
  }, [supabase])

  const STYLES = [
    { id: 'painterly', name: 'Painterly', image: '/images/landing/anime_1_stylr.jpg' },
    { id: 'manga', name: 'Manga', image: '/images/landing/anime_2_style.jpg' },
    { id: 'comic_book', name: 'Comic Book', image: '/images/landing/comic_style.jpg' },
    { id: 'noir', name: 'Noir', image: '/images/landing/cartoon style.jpg' },
    { id: 'webtoon', name: 'Webtoon', image: null },
    { id: 'retro_pop', name: 'Retro Pop', image: null }
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadAndGenerate = async () => {
    if (!fileInputRef.current?.files?.[0]) return
    
    setStatus('uploading')
    const formData = new FormData()
    formData.append('avatar', fileInputRef.current.files[0])
    formData.append('style', style)
    formData.append('base_description', baseDescription)
    
    try {
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      const data = await response.json()
      // data: { avatarUrl, characterDescription }
      
      setStatus('generating')
      
      setAvatar(data.avatarUrl)
      setGeneratedAvatar(data.avatarUrl)
      setStatus('done')
      
    } catch (error) {
      console.error(error)
      setStatus('idle')
    }
  }

  return (
    <main className="min-h-screen bg-cream px-9 py-12 flex flex-col items-center justify-center mt-[54px]">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-12">
        
        {/* LEFT - 50% */}
        <div className="w-full lg:w-1/2 flex flex-col gap-8">
          <div>
            <h1 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight text-ink mb-2">
              BUILD YOUR CHARACTER
            </h1>
            <p className="font-dm text-muted">Upload your photo. AI draws a version of you in any comic style.</p>
          </div>

          {/* UPLOAD ZONE */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-[400px] aspect-square border-2 border-dashed border-ink/20 rounded-[14px] flex flex-col items-center justify-center gap-4 bg-white/50 hover:border-yellow transition-colors cursor-pointer group overflow-hidden"
          >
            {imagePreview ? (
              <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <>
                <svg className="w-12 h-12 text-ink/20 group-hover:text-yellow transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <div className="text-center px-4">
                  <p className="font-barlow font-bold text-xl uppercase tracking-wider text-ink mb-1">
                    DROP YOUR PHOTO HERE
                  </p>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-wider">
                    JPG or PNG, up to 10MB
                  </p>
                </div>
              </>
            )}
          </div>

          {/* STYLE PICKER (Horizontal Scroll) */}
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x w-full max-w-[400px]">
            {STYLES.map((s) => (
              <button 
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`snap-start shrink-0 w-[100px] h-[120px] rounded-[10px] overflow-hidden relative transition-all ${
                  style === s.id ? 'border-[2.5px] border-yellow scale-105' : 'border border-ink/10'
                }`}
              >
                {s.image ? (
                  <img src={s.image} alt={s.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-ink/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="font-barlow font-bold text-[10px] uppercase tracking-wider text-white drop-shadow-md">
                    {s.name}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* GENERATE BUTTON */}
          <button 
            disabled={!imagePreview || status !== 'idle'}
            onClick={handleUploadAndGenerate}
            className="w-full max-w-[400px] bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase py-4 rounded-full transition hover:bg-[#c8dc38]"
          >
            {status === 'idle' ? 'GENERATE MY CHARACTER →' : status.toUpperCase() + '...'}
          </button>
        </div>

        {/* RIGHT - 50% */}
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[400px] aspect-square rounded-[14px] bg-ink overflow-hidden relative shadow-2xl flex flex-col items-center justify-center">
            
            {status === 'idle' && (
              <>
                <span className="absolute font-barlow font-black text-[300px] text-white/5 select-none pointer-events-none">?</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-white/40 z-10">
                  YOUR CHARACTER APPEARS HERE
                </span>
              </>
            )}

            {(status === 'uploading' || status === 'generating') && (
              <div className="flex flex-col items-center gap-6 z-10">
                <div className="w-16 h-16 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-yellow animate-pulse">
                  {status === 'uploading' ? 'UPLOADING...' : 'DRAWING YOUR CHARACTER...'}
                </span>
              </div>
            )}

            {status === 'done' && (
              <>
                <img 
                  src={generatedAvatar || ''} 
                  alt="Generated Avatar" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
                <div className="absolute top-4 left-4 bg-yellow px-3 py-1 rounded-full font-mono text-[9px] uppercase font-bold text-ink">
                  {style.replace('_', ' ')}
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  <button 
                    onClick={() => setStatus('idle')}
                    className="flex-1 border border-white/20 text-white font-mono text-[10px] tracking-wider uppercase py-3 rounded-full hover:bg-white hover:text-ink transition bg-ink/80 backdrop-blur-sm"
                  >
                    REGENERATE
                  </button>
                  <button className="flex-1 bg-yellow text-ink font-mono text-[10px] font-bold tracking-wider uppercase py-3 rounded-full hover:bg-[#c8dc38] transition shadow-lg">
                    SAVE THIS CHARACTER ✓
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
