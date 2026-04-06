import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-[54px] flex items-center justify-between px-8 bg-transparent">
      {/* LEFT SIDE — Logo */}
      <Link href="/" className="flex items-center gap-[5px] font-barlow font-black text-[20px] tracking-[0.1em] text-ink transition-opacity hover:opacity-80">
        COMICLIFE <span className="w-[7px] h-[7px] bg-yellow rounded-full" />
      </Link>
      
      {/* CENTER — Dark floating island */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-ink rounded-b-[16px] px-8 h-[54px] flex items-center gap-8">
        <Link 
          href="/dashboard" 
          className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors"
        >
          DASHBOARD
        </Link>
        <span className="text-white/20 font-mono text-[11px]">·</span>
        <Link 
          href="/avatar" 
          className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors"
        >
          AVATAR
        </Link>
        <span className="text-white/20 font-mono text-[11px]">·</span>
        <Link 
          href="#" 
          className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors"
        >
          FAQ
        </Link>
        <span className="text-white/20 font-mono text-[11px]">·</span>
        <Link 
          href="#" 
          className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors"
        >
          DISCORD
        </Link>
      </div>

      {/* RIGHT SIDE — Standalone CREATE COMIC button */}
      <Link 
        href="/diary/new" 
        className="bg-ink text-white font-mono text-[11px] tracking-[0.1em] uppercase px-[22px] py-[9px] rounded-full transition-all hover:bg-yellow hover:text-ink font-bold"
      >
        CREATE COMIC
      </Link>
    </nav>
  )
}
