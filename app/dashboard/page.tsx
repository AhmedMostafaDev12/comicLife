'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSessionStore } from '../../store/useSessionStore'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'diary' | 'stories' | 'public'>('diary')
  const { sessionId } = useSessionStore()
  
  // Placeholder data for MVP
  const entries = []
  
  return (
    <main className="min-h-screen bg-cream px-9 py-12">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        
        {/* HEADER ROW */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight text-ink">
            YOUR COMICS
          </h1>
          <div className="flex items-center gap-4">
            <Link 
              href="/stories/new" 
              className="border border-ink/25 text-ink font-mono text-[11px] tracking-[.08em] uppercase px-6 py-3 rounded-full transition hover:border-ink"
            >
              NEW STORY
            </Link>
            <Link 
              href="/diary/new" 
              className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-6 py-3 rounded-full transition hover:bg-[#c8dc38]"
            >
              + NEW DIARY
            </Link>
          </div>
        </div>

        {/* PROFILE STRIP */}
        <div className="bg-ink rounded-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="w-[72px] h-[72px] rounded-full bg-cream/10 border-2 border-white/10 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-white font-dm text-lg font-bold">Session: {sessionId ? sessionId.slice(0, 8) : 'Loading...'}</span>
              <div className="flex items-center gap-2">
                <span className="bg-yellow text-ink font-mono text-[9px] uppercase px-2 py-0.5 rounded-full font-bold">
                  Painterly
                </span>
                <span className="text-white/50 font-mono text-[10px] uppercase">
                  0 Creations
                </span>
              </div>
            </div>
          </div>
          
          <Link 
            href="/avatar" 
            className="w-full md:w-auto text-center border border-white/20 text-white font-mono text-[10px] tracking-wider uppercase px-5 py-2.5 rounded-full transition hover:bg-white hover:text-ink"
          >
            EDIT AVATAR →
          </Link>
        </div>

        {/* TABS ROW */}
        <div className="flex items-center gap-8 border-b border-ink/10">
          {(['diary', 'stories', 'public'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-mono text-[11px] uppercase tracking-wider relative transition-colors ${
                activeTab === tab ? 'text-ink font-bold' : 'text-ink/40 hover:text-ink/70'
              }`}
            >
              {tab === 'diary' ? 'DIARY ENTRIES' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* CONTENT GRID */}
        {entries.length === 0 ? (
          <div className="border-2 border-dashed border-ink/20 rounded-card p-16 flex flex-col items-center justify-center gap-6">
            <svg className="w-12 h-12 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <div className="flex flex-col items-center gap-2">
              <span className="font-barlow font-bold text-2xl uppercase tracking-wider text-ink/40">
                Start your first comic
              </span>
              <span className="font-dm text-sm text-ink/60">
                Turn your daily diary into an illustrated story.
              </span>
            </div>
            <Link 
              href="/diary/new" 
              className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-[.08em] uppercase px-6 py-3 rounded-full transition hover:bg-[#c8dc38] mt-2"
            >
              CREATE NOW
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Real cards would go here */}
          </div>
        )}
      </div>
    </main>
  )
}
