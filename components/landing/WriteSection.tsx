'use client'

import React from 'react'

export default function WriteSection() {
  return (
    <section className="relative w-full min-h-screen overflow-hidden flex items-center">

      {/* Background */}
      <img
        src="/images/landing/write_your_story_background.png"
        alt="Write your story"
        className="absolute inset-0 w-full h-full object-cover object-center md:object-right"
      />

      {/* TOP FADE — blends from StyleSection cream */}
      <div 
        className="absolute top-0 left-0 right-0 h-[160px] z-[5] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #E8E4D8 0%, rgba(232, 228, 216, 0.8) 30%, transparent 100%)'
        }}
      />

      {/* BOTTOM FADE — blends to next section cream */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[160px] z-[5] pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #E8E4D8 0%, rgba(232, 228, 216, 0.8) 30%, transparent 100%)'
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 w-full flex items-center px-14 min-h-screen py-24 md:py-0">
        
        {/* LEFT — Overlay Stack */}
        <div className="relative w-full md:w-[50%] h-[600px] md:h-full flex items-center">
          
          {/* 1. The floating comic sequence card (Behind the text) */}
          <div className="absolute left-[32%] top-[45%] -translate-y-1/2 w-[90%] md:w-[60%] z-10">
            <div
              className="bg-[#F5F0E8] rounded-[12px] p-[6px]
                         shadow-[0_12px_48px_rgba(0,0,0,0.18)]"
              style={{ transform: 'rotate(-4deg)' }}
            >
              {/* Image */}
              <div className="rounded-[8px] overflow-hidden aspect-[3/4]">
                <img
                  src="/images/landing/comic_sequence.jpg"
                  alt="Comic sequence"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Label strip */}
              <div className="px-2 pt-[5px] pb-[4px]">
                <span
                  className="font-barlow font-black text-[#0E0E0E] uppercase text-[11px] tracking-wide leading-none"
                >
                  COMIC SEQUENCE
                </span>
              </div>
            </div>
          </div>

          {/* 2. The Big headline (Overlays the card) */}
          <div className="relative z-20 pointer-events-none">
            <h2
              className="font-barlow font-black text-[#0E0E0E] uppercase leading-[0.88] tracking-tight
                         text-[clamp(64px,8vw,118px)] drop-shadow-[0_4px_12px_rgba(232,228,216,0.4)]"
            >
              WRITE<br />YOUR<br />STORY
            </h2>
            
            {/* Subtext */}
            <p
              className="font-dm text-[#0E0E0E]/60 text-[15px] leading-[1.65] max-w-[280px] mt-6"
            >
              Turn your diary into<br />animation and comics.
            </p>
          </div>

        </div>

      </div>

    </section>
  )
}
