export default function HowItWorks() {
  const steps = [
    { num: '01', title: 'Upload Photo', desc: 'Add a single portrait photo. Our AI turns it into an illustrated character.' },
    { num: '02', title: 'Write Diary', desc: 'Type your daily thoughts, a memory, or an inside joke. Raw honesty is best.' },
    { num: '03', title: 'AI Draws Panels', desc: 'Watch as words transform into a cinematic, fully illustrated comic sequence.' },
    { num: '04', title: 'Add Music & Share', desc: 'Attach a Spotify track to set the mood, then share your comic with friends.' },
  ]

  return (
    <section className="relative bg-ink text-cream py-32 px-9">
      {/* TOP FADE — blends from WriteSection cream */}
      <div 
        className="absolute top-0 left-0 right-0 h-[160px] z-[5] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #E8E4D8 0%, rgba(232, 228, 216, 0.4) 40%, transparent 100%)'
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10 pt-12">
        <h2 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight mb-16">
          HOW IT WORKS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div 
              key={i} 
              className="bg-cream text-ink rounded-card p-8 flex flex-col gap-6 transition-colors hover:bg-yellow group cursor-default"
            >
              <span className="font-mono text-3xl font-bold tracking-tighter opacity-20 group-hover:opacity-40 transition-opacity">
                {step.num}
              </span>
              <div>
                <h3 className="font-barlow font-bold text-2xl uppercase tracking-wider mb-3">
                  {step.title}
                </h3>
                <p className="font-dm text-sm text-ink/70 group-hover:text-ink/90 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
