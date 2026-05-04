import Image from 'next/image'

export default function StyleGallery() {
  const styles = [
    { name: 'Painterly', unlocked: true, image: '/images/landing/anime_1_stylr.jpg' },
    { name: 'Comic Book', unlocked: true, image: '/images/landing/comic_style.jpg' },
    { name: 'Manga', unlocked: true, image: '/images/landing/anime_2_style.jpg' },
    { name: 'Noir', unlocked: true, image: '/images/landing/cartoon style.jpg' },
    { name: 'Webtoon', unlocked: true, image: null },
    { name: 'Retro Pop', unlocked: false, image: null },
    { name: 'Watercolor', unlocked: false, image: null },
    { name: 'Sketch', unlocked: false, image: null },
    { name: 'Dark Fantasy', unlocked: false, image: null },
    { name: 'Pop Art', unlocked: false, image: null },
  ]

  return (
    <section className="bg-cream py-24 px-9 border-t border-ink/5">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <h2 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight text-ink">
          CHOOSE YOUR STYLE
        </h2>
        <p className="font-dm text-muted max-w-sm md:text-right">
          Each style gives your story a completely different soul. Unlock new aesthetics as you create more memories.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {styles.map((style, i) => (
          <div 
            key={i} 
            className="aspect-[3/4] rounded-card overflow-hidden bg-white/40 relative group transition-transform hover:-translate-y-1 shadow-sm hover:shadow-md"
          >
            {style.unlocked ? (
              <>
                {style.image ? (
                  <Image 
                    src={style.image} 
                    alt={style.name} 
                    fill
                    className="object-cover transition-transform group-hover:scale-105" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-ink/5 z-0" />
                )}
                <div className="absolute top-3 left-3 z-10 bg-yellow px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
                  Unlocked
                </div>
                <div className="absolute bottom-3 left-3 z-10 text-white font-barlow font-bold text-xl uppercase tracking-wider drop-shadow-lg">
                  {style.name}
                </div>
              </>
            ) : (
              <div className="absolute inset-3 border-2 border-dashed border-ink/20 rounded-[8px] flex flex-col items-center justify-center p-4 text-center gap-2">
                <svg className="w-6 h-6 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                  Drop your<br/>{style.name}<br/>image
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
