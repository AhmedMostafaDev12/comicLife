'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionStore } from '../../store/useSessionStore'
import NavSpinBadge from './NavSpinBadge'

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`font-mono text-[11px] tracking-[0.1em] transition-colors relative pb-1 ${
        active ? 'text-yellow' : 'text-white/60 hover:text-white'
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow" />
      )}
    </Link>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)

  const hideNavbar = pathname.startsWith('/read/')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (hideNavbar) return null

  const mobileActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] h-[64px] flex items-center justify-between px-6 md:px-8 transition-all duration-300 ${
      scrolled ? 'bg-cream/80 backdrop-blur-md border-b border-ink/5 shadow-sm' : 'bg-transparent'
    }`}>

      {/* LEFT — Logo */}
      <Link href="/" className="flex items-center gap-[5px] font-barlow font-black text-[20px] tracking-[0.1em] text-ink transition-opacity hover:opacity-80 z-[110]">
        COMICLIFE <NavSpinBadge />
      </Link>

      {/* CENTER — Dark floating island (Desktop) */}
      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-0 bg-ink rounded-b-[16px] px-8 h-[54px] items-center gap-6 shadow-xl">
        {isLoggedIn ? (
          <>
            <NavLink href="/dashboard" label="DASHBOARD" />
            <span className="text-white/20 font-mono text-[11px]">—</span>
            <NavLink href="/profile" label="PROFILE" />
          </>
        ) : (
          <Link href="/#examples" className="font-mono text-[11px] tracking-[0.1em] text-white/60 hover:text-yellow transition-colors">
            SEE EXAMPLES
          </Link>
        )}
      </div>

      {/* RIGHT — Actions */}
      <div className="flex items-center gap-3">
        {!isLoggedIn && (
          <Link
            href="/auth/signup"
            className="hidden md:block border border-ink/30 text-ink font-mono text-[11px] tracking-[0.1em] uppercase px-[18px] py-[8px] rounded-full transition-all hover:border-ink"
          >
            GET STARTED
          </Link>
        )}
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
        {isLoggedIn ? (
          <>
            <Link
              onClick={() => setMobileMenuOpen(false)}
              href="/dashboard"
              className={`font-barlow font-black text-4xl transition-colors ${mobileActive('/dashboard') ? 'text-yellow' : 'text-white hover:text-yellow'}`}
            >
              DASHBOARD
            </Link>
            <Link
              onClick={() => setMobileMenuOpen(false)}
              href="/profile"
              className={`font-barlow font-black text-4xl transition-colors ${mobileActive('/profile') ? 'text-yellow' : 'text-white hover:text-yellow'}`}
            >
              PROFILE
            </Link>
          </>
        ) : (
          <>
            <Link
              onClick={() => setMobileMenuOpen(false)}
              href="/#examples"
              className="font-barlow font-black text-4xl text-white hover:text-yellow transition-colors"
            >
              SEE EXAMPLES
            </Link>
            <Link
              onClick={() => setMobileMenuOpen(false)}
              href="/auth/signup"
              className="font-barlow font-black text-4xl text-white hover:text-yellow transition-colors"
            >
              GET STARTED
            </Link>
          </>
        )}
        <Link
          onClick={() => setMobileMenuOpen(false)}
          href="/diary/new"
          className="bg-yellow text-ink font-mono text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-full mt-4"
        >
          CREATE COMIC
        </Link>
      </div>
    </nav>
  )
}
