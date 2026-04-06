'use client'

import { ArtStyle } from '../../types'
import { useRef, useState } from 'react'

interface StylePickerProps {
  selected: string
  onChange: (style: ArtStyle | string) => void
}

const STYLES: { id: ArtStyle; name: string; image: string | null }[] = [
  { id: 'painterly', name: 'Painterly', image: '/images/landing/anime_1_stylr.jpg' },
  { id: 'comic_book', name: 'Comic Book', image: '/images/landing/comic_style.jpg' },
  { id: 'manga', name: 'Manga', image: '/images/landing/anime_2_style.jpg' },
  { id: 'noir', name: 'Noir', image: '/images/landing/cartoon style.jpg' },
  { id: 'webtoon', name: 'Webtoon', image: null },
  { id: 'retro_pop', name: 'Retro Pop', image: null },
  { id: 'watercolor', name: 'Watercolor', image: null },
  { id: 'sketch', name: 'Sketch', image: null },
  { id: 'dark_fantasy', name: 'Dark Fantasy', image: null },
  { id: 'pop_art', name: 'Pop Art', image: null }
]

export default function StylePicker({ selected, onChange }: StylePickerProps) {
  const [customStylePreview, setCustomStylePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setCustomStylePreview(base64)
        onChange(`custom:${base64}`) // Prefix with custom: to identify it in the API
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {/* PRE-DEFINED STYLES */}
      {STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => onChange(style.id)}
          className={`relative aspect-[3/4] rounded-[10px] overflow-hidden transition-all hover:-translate-y-1 ${
            selected === style.id ? 'border-[3px] border-yellow shadow-xl scale-105 z-10' : 'border border-ink/10 opacity-70 hover:opacity-100'
          }`}
        >
          {style.image ? (
            <img 
              src={style.image} 
              alt={style.name} 
              className="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-105" 
            />
          ) : (
            <div className="absolute inset-0 bg-ink/5 flex items-center justify-center font-mono text-[8px] uppercase text-ink/20">
              No Preview
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-ink/80 to-transparent">
            <span className="text-white font-barlow font-bold text-[14px] uppercase tracking-wider">
              {style.name}
            </span>
          </div>
        </button>
      ))}

      {/* CUSTOM STYLE UPLOAD */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCustomUpload} 
        className="hidden" 
        accept="image/*"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`relative aspect-[3/4] rounded-[10px] overflow-hidden transition-all border-2 border-dashed flex flex-col items-center justify-center gap-3 group ${
          selected.startsWith('custom:') ? 'border-yellow bg-yellow/5' : 'border-ink/10 bg-white/50 hover:border-ink/30'
        }`}
      >
        {customStylePreview ? (
          <>
            <img src={customStylePreview} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Custom Style" />
            <span className="relative z-10 bg-yellow text-ink font-mono text-[9px] font-bold px-2 py-1 rounded">CUSTOM STYLE</span>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 text-ink/20 group-hover:text-ink/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-barlow font-bold text-[12px] uppercase tracking-widest text-ink/40 group-hover:text-ink/60">
              UPLOAD STYLE
            </span>
          </>
        )}
      </button>
    </div>
  )
}
