import Link from 'next/link'

export default function CtaStrip() {
  return (
    <section className="bg-ink border-t border-white/10 w-full py-12 px-9">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        <h2 className="font-barlow font-black text-4xl md:text-[52px] leading-none uppercase tracking-tight text-white">
          START YOUR FIRST <span className="text-yellow">COMIC</span> TODAY
        </h2>

        <div className="flex items-center gap-4">
          <Link
            href="/#examples"
            className="border border-white/60 text-white font-mono text-[11px] font-bold tracking-[.08em] uppercase px-6 py-3 rounded-full transition hover:bg-white hover:text-ink whitespace-nowrap"
          >
            SEE EXAMPLES
          </Link>
          <Link 
            href="/diary/new" 
            className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-6 py-3 rounded-full transition hover:bg-[#c8dc38] whitespace-nowrap"
          >
            GET STARTED ↗
          </Link>
        </div>

      </div>
    </section>
  )
}
