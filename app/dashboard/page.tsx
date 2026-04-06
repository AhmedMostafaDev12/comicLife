'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '../../lib/supabase'
import { Comic } from '../../types'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'diary' | 'stories' | 'public'>('diary')
  const [comics, setComics] = useState<Comic[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  
  useEffect(() => {
    async function fetchComics() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('comics')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setComics(data || [])
      } catch (err) {
        console.error('Error fetching comics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchComics()
  }, [supabase])
  
  return (
    <main className="min-h-screen bg-cream px-9 py-12 mt-[54px]">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        
        {/* HEADER ROW */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight text-ink">
            YOUR COMICS
          </h1>
          <div className="flex items-center gap-4">
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
            <div className="w-[72px] h-[72px] rounded-full bg-cream/10 border-2 border-white/10 shrink-0 overflow-hidden">
               {/* Could show user avatar here */}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-white font-dm text-lg font-bold">My Creative Studio</span>
              <div className="flex items-center gap-2">
                <span className="text-white/50 font-mono text-[10px] uppercase">
                  {comics.length} {comics.length === 1 ? 'Creation' : 'Creations'}
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
              {tab === 'diary' ? 'MY STORIES' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* CONTENT GRID */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comics.length === 0 ? (
          <div className="border-2 border-dashed border-ink/20 rounded-card p-16 flex flex-col items-center justify-center gap-6">
            <svg className="w-12 h-12 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <div className="flex flex-col items-center gap-2 text-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {comics.map((comic) => (
              <Link 
                href={`/read/${comic.id}`} 
                key={comic.id}
                className="group flex flex-col gap-4"
              >
                <div className="aspect-[4/3] bg-ink rounded-card overflow-hidden border border-ink relative shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  {/* Comic Cover */}
                  {comic.cover_url ? (
                    <img src={comic.cover_url} alt={comic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1">
                      <div className="bg-white/5 rounded-sm" />
                      <div className="bg-white/5 rounded-sm" />
                      <div className="bg-white/5 rounded-sm" />
                      <div className="bg-white/5 rounded-sm" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-yellow text-ink font-mono text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-wider">
                      Read Story
                    </span>
                  </div>
                  <div className="absolute top-3 left-3 bg-white border border-ink px-2 py-0.5 font-mono text-[8px] uppercase font-bold">
                    {comic.style}
                  </div>
                </div>
                <div className="flex flex-col gap-1 px-1">
                  <h3 className="font-barlow font-bold text-xl uppercase tracking-tight text-ink group-hover:text-yellow transition-colors">
                    {comic.title}
                  </h3>
                  <span className="font-mono text-[10px] text-muted uppercase">
                    {new Date(comic.created_at).toLocaleDateString()} — {comic.story.split(/\s+/).length} Words
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
