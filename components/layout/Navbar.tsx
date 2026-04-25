'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavSpinBadge from './NavSpinBadge'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const hideNavbar = pathname.startsWith('/read/') || pathname.startsWith('/film/')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (hideNavbar) return null

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] h-[64px] flex items-center justify-between px-6 md:px-8 transition-all duration-300 ${
      scrolled ? 'bg-cream/80 backdrop-blur-md border-b border-ink/5 shadow-sm' : 'bg-transparent'
    }`}>
      {/* LEFT SIDE — Logo */}
      <Link href="/" className="flex items-center gap-[5px] font-barlow font-black text-[20px] tracking-[0.1em] text-ink transition-opacity hover:opacity-80 z-[110]">
        COMICLIFE <NavSpinBadge />
      </Link>
      
      {/* CENTER — Dark floating island (Desktop Only) */}
      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-0 bg-ink rounded-b-[16px] px-8 h-[54px] items-center gap-6 shadow-xl">
        <Link href="/dashboard" className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors">DASHBOARD</Link>
        <span className="text-white/20 font-mono text-[11px]">—</span>
        <Link href="/avatar" className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors">AVATAR</Link>
        <span className="text-white/20 font-mono text-[11px]">—</span>
        <Link href="/profile" className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors">PROFILE</Link>
        <span className="text-white/20 font-mono text-[11px]">—</span>
        <Link href="#" className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-white transition-colors">FAQ</Link>
      </div>

      {/* RIGHT SIDE — Actions */}
      <div className="flex items-center gap-4">
        <Link 
          href="/diary/new" 
          className="hidden md:block bg-ink text-white font-mono text-[11px] tracking-[0.1em] uppercase px-[22px] py-[9px] rounded-full transition-all hover:bg-yellow hover:text-ink font-bold"
        >
          CREATE COMIC
        </Link>

        {/* MOBILE MENU TOGGLE */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 z-[110]"
        >
          <div className={`w-6 h-0.5 bg-ink transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-6 h-0.5 bg-ink transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
          <div className={`w-6 h-0.5 bg-ink transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <div className={`fixed inset-0 bg-ink z-[100] flex flex-col items-center justify-center gap-8 transition-all duration-500 lg:hidden ${
        mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-4'
      }`}>
        <Link onClick={() => setMobileMenuOpen(false)} href="/dashboard" className="font-barlow font-black text-4xl text-white hover:text-yellow transition-colors">DASHBOARD</Link>
        <Link onClick={() => setMobileMenuOpen(false)} href="/avatar" className="font-barlow font-black text-4xl text-white hover:text-yellow transition-colors">AVATAR</Link>
        <Link onClick={() => setMobileMenuOpen(false)} href="/profile" className="font-barlow font-black text-4xl text-white hover:text-yellow transition-colors">PROFILE</Link>
        <Link onClick={() => setMobileMenuOpen(false)} href="/diary/new" className="bg-yellow text-ink font-mono text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-full mt-4">CREATE COMIC</Link>
      </div>
    </nav>
  )
}
