'use client'

import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden flex flex-col bg-cream pt-[54px]">
      {/* BACKGROUND LAYER */}
      <div className="absolute inset-0 z-[1] w-full h-full">
        <img 
          src="/images/landing/the background.jpg" 
          alt="The Entire History of You" 
          className="w-full h-full object-cover object-right md:object-[70%_center] lg:object-right"
        />
      </div>

      {/* SUBTLE GRADIENT OVERLAY (Desktop) */}
      <div 
        className="absolute inset-0 z-[2] pointer-events-none hidden md:block"
        style={{
          background: `linear-gradient(
            to right,
            rgba(232, 228, 216, 0.72) 0%,
            rgba(232, 228, 216, 0.45) 40%,
            rgba(232, 228, 216, 0.0) 65%
          )`
        }}
      />

      {/* MOBILE OVERLAY (stronger gradient for readability) */}
      <div 
        className="absolute inset-0 z-[2] pointer-events-none md:hidden"
        style={{
          background: `linear-gradient(to right, rgba(232, 228, 216, 0.9) 0%, rgba(232, 228, 216, 0.7) 100%)`
        }}
      />

      {/* CONTENT LAYER */}
      <div className="relative z-[3] flex-1 flex items-center px-6 md:px-12 lg:px-24">
        <div className="flex flex-col w-full md:max-w-[480px] py-12 md:py-0 pl-0 md:pl-12 lg:pl-0">
          
          {/* LABEL ROW */}
          <div className="flex items-center gap-[10px] mb-6">
            <div className="w-7 h-[1.5px] bg-[#6B6860]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6860]">COMICLIFE PLATFORM</span>
          </div>

          {/* HEADLINE BLOCK */}
          <div className="font-barlow font-black leading-[0.9] tracking-[-0.02em] text-ink uppercase">
            <h1 className="text-[clamp(52px,12vw,72px)] md:text-[80px] lg:text-[clamp(64px,8.5vw,128px)]">
              THE
            </h1>
            <h1 className="text-[clamp(52px,12vw,72px)] md:text-[80px] lg:text-[clamp(64px,8.5vw,128px)]">
              ENTIRE HISTORY
            </h1>
            <h1 className="text-[clamp(52px,12vw,72px)] md:text-[80px] lg:text-[clamp(64px,8.5vw,128px)]">
              OF YOU
            </h1>
          </div>

          {/* BODY TEXT */}
          <p className="font-dm text-[14px] text-ink/60 leading-[1.7] max-w-[300px] mt-7">
            Write your diary. Watch AI turn every entry into illustrated comic panels — starring you.
          </p>

          {/* CTA BUTTON */}
          <div className="mt-6">
            <Link 
              href="/diary/new"
              className="inline-flex items-center gap-2 bg-yellow text-ink font-mono text-[11px] font-bold tracking-[0.1em] uppercase px-[28px] py-[13px] rounded-full shadow-[0_4px_20px_rgba(212,232,74,0.4)] hover:bg-[#c8dc38] hover:-translate-y-0.5 transition-all duration-200 hover:shadow-[0_8px_25px_rgba(212,232,74,0.5)]"
            >
              GET STARTED ↗
            </Link>
          </div>

          {/* SOCIAL PROOF ROW */}
          <div className="mt-8 flex items-center gap-3.5">
            <div className="flex items-center -space-x-2.5">
              {[
                'bg-[#D0CEC8]',
                'bg-[#BFBDB5]',
                'bg-[#0E0E0E]'
              ].map((color, i) => (
                <div 
                  key={i} 
                  className={`w-10 h-10 rounded-full border-2 border-cream ${color} flex items-center justify-center`}
                >
                  <span className="text-[9px] text-white/40 font-mono">U{i+1}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-barlow font-black text-[18px] leading-none text-ink">
                2,400+
              </div>
              <div className="font-mono text-[9px] text-[#6B6860] uppercase tracking-[.08em] mt-1">
                COMICS CREATED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SCROLL FADE */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[120px] z-[4] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #E8E4D8)'
        }}
      />
    </section>
  )
}
