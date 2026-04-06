'use client'

interface StylePickerProps {
  selected: string
  onChange: (style: string) => void
}

const STYLES = [
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => onChange(style.id)}
          className={`relative aspect-[3/4] rounded-[10px] overflow-hidden transition-transform hover:-translate-y-1 ${
            selected === style.id ? 'border-[2.5px] border-yellow shadow-md' : 'border border-ink/10'
          }`}
        >
          {style.image ? (
            <img 
              src={style.image} 
              alt={style.name} 
              className="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-105" 
            />
          ) : (
            <div className="absolute inset-0 bg-ink/5" />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-ink/80 to-transparent">
            <span className="text-white font-barlow font-bold text-lg uppercase tracking-wider">
              {style.name}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
