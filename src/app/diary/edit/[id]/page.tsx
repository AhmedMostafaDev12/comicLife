'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DiaryEditor from '@/components/diary/DiaryEditor'
import StylePicker from '@/components/diary/StylePicker'
import ComicGrid from '@/components/comic/ComicGrid'
import { createSupabaseClient } from '@/lib/supabase'
import { ArtStyle, Panel } from '@/types'

type EditTab = 'panels' | 'story' | 'style'

export default function EditComicPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<EditTab>('panels')

  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [story, setStory] = useState('')
  const [style, setStyle] = useState<ArtStyle>('manga')
  const [panels, setPanels] = useState<Panel[]>([])
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([])
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }

        const [{ data: comic }, { data: panelsData }, { data: chars }] = await Promise.all([
          supabase.from('comics').select('*').eq('id', id).single(),
          supabase.from('panels').select('*').eq('comic_id', id).order('panel_index', { ascending: true }),
          supabase.from('characters').select('*').eq('user_id', user.id),
        ])

        if (!comic) { router.push('/dashboard'); return }

        setTitle(comic.title || '')
        setStory(comic.story || '')
        setStyle((comic.style as ArtStyle) || 'manga')
        setAvailableCharacters(chars || [])
        setPanels((panelsData || []).map((p: any) => ({
          id: p.id,
          order: p.panel_index,
          caption: p.caption,
          image_url: p.image_url,
          prompt_used: p.prompt,
          style: comic.style,
          speech_bubble: p.speech_bubble,
          bubbles: p.bubbles,
        })))
      } catch (err) {
        console.error('Failed to load comic:', err)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/update-comic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId: id, title, story, style, panels }),
      })
      if (!res.ok) throw new Error('Save failed')
      router.push(`/read/${id}`)
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleCharacter = (charId: string) => {
    setSelectedCharIds(prev =>
      prev.includes(charId) ? prev.filter(i => i !== charId) : [...prev, charId]
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 mt-[64px]">
        <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-ink text-[11px] uppercase tracking-widest">Loading comic...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream mt-[64px]">

      {/* TOP BAR */}
      <div className="sticky top-[64px] z-30 bg-cream border-b border-ink/10 px-6 md:px-9 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="shrink-0 text-ink/40 hover:text-ink font-mono text-[10px] uppercase tracking-widest transition">
              ← DASHBOARD
            </Link>
            <div className="w-px h-4 bg-ink/20 shrink-0" />
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false) }}
                onBlur={() => setEditingTitle(false)}
                className="font-barlow font-black text-2xl uppercase tracking-tight text-ink bg-white border border-yellow rounded-lg px-3 py-1 outline-none min-w-0 flex-1"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="font-barlow font-black text-2xl uppercase tracking-tight text-ink hover:text-yellow transition-colors truncate cursor-text"
                title="Click to rename"
              >
                {title || 'Untitled Comic'}
              </h1>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 bg-yellow disabled:opacity-50 text-ink font-mono text-[11px] font-bold uppercase px-6 py-3 rounded-full hover:bg-[#c8dc38] transition"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="border-b border-ink/10 px-6 md:px-9">
        <div className="max-w-7xl mx-auto flex gap-1">
          {(['panels', 'story', 'style'] as EditTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 font-mono text-[10px] uppercase tracking-widest border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-yellow text-ink font-bold'
                  : 'border-transparent text-ink/40 hover:text-ink'
              }`}
            >
              {tab === 'panels' ? 'PANELS' : tab === 'story' ? 'STORY' : 'CAST & STYLE'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="px-6 md:px-9 py-8">
        <div className="max-w-7xl mx-auto">

          {/* PANELS TAB */}
          {activeTab === 'panels' && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="font-barlow font-black text-2xl uppercase text-ink mb-1">Edit Panels</h2>
                <p className="font-dm text-sm text-muted">Edit speech bubbles and captions. Use regenerate to redo individual panels.</p>
              </div>
              {panels.length === 0 ? (
                <div className="border-2 border-dashed border-ink/10 rounded-card p-12 text-center">
                  <span className="font-barlow font-bold text-xl uppercase text-ink/30">No panels found</span>
                </div>
              ) : (
                <ComicGrid panels={panels} editable={true} />
              )}
            </div>
          )}

          {/* STORY TAB */}
          {activeTab === 'story' && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 max-w-3xl">
              <div>
                <h2 className="font-barlow font-black text-2xl uppercase text-ink mb-1">Edit Story</h2>
                <p className="font-dm text-sm text-muted">Changes to the story won&apos;t auto-regenerate panels — go to Panels tab to regenerate individually.</p>
              </div>
              <DiaryEditor content={story} onChange={setStory} />
            </div>
          )}

          {/* CAST & STYLE TAB */}
          {activeTab === 'style' && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 max-w-3xl">
              <div>
                <h2 className="font-barlow font-black text-2xl uppercase text-ink mb-1">Cast & Style</h2>
                <p className="font-dm text-sm text-muted">Changing style or cast won&apos;t auto-regenerate panels — go to Panels tab to regenerate individually.</p>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[10px] uppercase text-ink/40 tracking-widest">Characters in this story</h3>
                {availableCharacters.length === 0 ? (
                  <Link href="/profile" className="text-ink/40 font-dm text-sm italic hover:text-yellow transition-colors underline">
                    + Add characters in your Profile first
                  </Link>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {availableCharacters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => toggleCharacter(char.id)}
                        className={`px-5 py-3 rounded-[12px] border-2 transition-all flex flex-col gap-1 text-left ${
                          selectedCharIds.includes(char.id) ? 'border-yellow bg-yellow/5' : 'border-ink/5 bg-white'
                        }`}
                      >
                        <span className="font-barlow font-bold text-lg uppercase leading-none">{char.name}</span>
                        <span className="font-dm text-[10px] text-muted truncate w-24">{char.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-[10px] uppercase text-ink/40 tracking-widest">Visual Style</h3>
                <StylePicker selected={style} onChange={(s) => setStyle(s as ArtStyle)} />
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
