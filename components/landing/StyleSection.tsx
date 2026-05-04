'use client'

import React from 'react'
import Image from 'next/image'

interface CardStyle {
  top: string
  left: string
  width: string
  rotate: string
  zIndex?: number
}

interface StyleCardData {
  id: string
  letter: string
  num: string
  name: string
  image: string
  style: CardStyle
}

const STYLE_CARDS: StyleCardData[] = [
  {
    id: 'painterly',
    letter: 'A', num: 'STYLE 01', name: 'PAINTERLY',
    image: '/images/landing/anime_1_stylr.jpg',
    style: { top: '8%', left: '6%', width: '36%', rotate: '-3deg' }
  },
  {
    id: 'comic_book',
    letter: 'B', num: 'STYLE 02', name: 'COMIC BOOK',
    image: '/images/landing/comic_style.jpg',
    style: { top: '8%', left: '54%', width: '36%', rotate: '2deg' }
  },
  {
    id: 'manga',
    letter: 'C', num: 'STYLE 03', name: 'MANGA',
    image: '/images/landing/anime_2_style.jpg',
    style: { top: '32%', left: '26%', width: '38%', rotate: '-1deg', zIndex: 10 }
  },
  {
    id: 'cartoon',
    letter: 'D', num: 'STYLE 04', name: 'CARTOON',
    image: '/images/landing/cartoon style.jpg',
    style: { top: '32%', left: '64%', width: '30%', rotate: '3deg' }
  },
  {
    id: 'concept_art',
    letter: 'E', num: 'STYLE 05', name: 'CONCEPT ART',
    image: '/images/landing/cfb90138461a29c995e4c0bdf3953f1c.jpg',
    style: { top: '58%', left: '6%', width: '38%', rotate: '-2deg' }
  },
  {
    id: 'retro_anime',
    letter: 'F', num: 'STYLE 06', name: 'RETRO ANIME',
    image: '/images/landing/c5288a22408ca329bd9e9123ac130280.jpg',
    style: { top: '58%', left: '54%', width: '36%', rotate: '2deg' }
  },
]

const StyleCard = ({ card }: { card: StyleCardData }) => (
  <div
    className="absolute cursor-pointer transition-all duration-200 hover:scale-105 hover:z-20"
    style={{
      top: card.style.top,
      left: card.style.left,
      width: card.style.width,
      rotate: card.style.rotate,
      zIndex: card.style.zIndex || 5,
    }}
  >
    {/* White card border — exactly like reference */}
    <div className="bg-[#F5F0E8] rounded-[8px] p-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">

      {/* Image area */}
      <div className="relative rounded-[5px] overflow-hidden" style={{ aspectRatio: '1/1' }}>
        <Image
          src={card.image}
          alt={card.name}
          fill
          className="object-cover object-top"
        />

        {/* Letter badge — top left, exactly as reference */}
        <div className="absolute top-[5px] left-[5px] w-4 h-4 rounded-full
                        bg-black/60 flex items-center justify-center z-10">
          <span className="font-mono text-white text-[8px] font-bold leading-none">
            {card.letter}
          </span>
        </div>

        {/* Style number — top right, exactly as reference */}
        <span className="absolute top-[5px] right-[5px]
                         font-mono text-white/70 text-[7px] tracking-wide z-10">
          {card.num}
        </span>
      </div>

      {/* Name label strip — bottom white area, exactly as reference */}
      <div className="px-[5px] pt-[3px] pb-[2px]">
        <span className="font-barlow font-black text-[11px]
                         uppercase tracking-wide text-[#0E0E0E] leading-none">
          {card.name}
        </span>
      </div>

    </div>
  </div>
)

export default function StyleSection() {
  return (
    <section id="examples" className="relative w-full min-h-screen overflow-hidden flex items-center">

      {/* Background image — fills entire section */}
      <Image
        src="/images/landing/choose_your_style.png"
        alt="Choose your style"
        fill
        className="object-cover object-center md:object-left"
      />

      {/* TOP FADE — blends from HeroSection cream */}
      <div 
        className="absolute top-0 left-0 right-0 h-[160px] z-[2] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #E8E4D8 0%, rgba(232, 228, 216, 0.8) 30%, transparent 100%)'
        }}
      />

      {/* BOTTOM FADE — blends to next section cream */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[160px] z-[2] pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #E8E4D8 0%, rgba(232, 228, 216, 0.8) 30%, transparent 100%)'
        }}
      />

      {/* Cards container — positioned over right side */}
      <div className="relative z-10 w-full flex items-center justify-end px-[6%] md:pr-[4%] py-24 md:py-0">
        <div className="relative w-full md:w-[54%] h-[600px] md:h-[800px]">
          {STYLE_CARDS.map((card) => (
            <StyleCard key={card.id} card={card} />
          ))}
        </div>
      </div>

    </section>
  )
}
