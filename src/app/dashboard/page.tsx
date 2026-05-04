'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { Comic } from '@/types'

interface Folder {
  id: string
  name: string
  created_at: string
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `Week ${week} · ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
}

function groupByWeek(comics: Comic[]): Record<string, Comic[]> {
  return comics.reduce((acc, comic) => {
    const label = getWeekLabel(comic.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(comic)
    return acc
  }, {} as Record<string, Comic[]>)
}

function ComicCard({ comic, onDelete, deleting }: { comic: Comic; onDelete: (id: string, title: string) => void; deleting: string | null }) {
  return (
    <div className="group flex flex-col gap-4">
      <Link href={`/read/${comic.id}`} className="block">
        <div className="aspect-[4/3] bg-ink rounded-card overflow-hidden border border-ink relative shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
          {comic.cover_url ? (
            <img src={comic.cover_url} alt={comic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1">
              <div className="bg-white/5 rounded-sm" /><div className="bg-white/5 rounded-sm" />
              <div className="bg-white/5 rounded-sm" /><div className="bg-white/5 rounded-sm" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-yellow text-ink font-mono text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-wider">Read</span>
          </div>
          <div className="absolute top-3 left-3 bg-white border border-ink px-2 py-0.5 font-mono text-[8px] uppercase font-bold">{comic.style}</div>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-barlow font-bold text-xl uppercase tracking-tight text-ink group-hover:text-yellow transition-colors truncate">{comic.title}</h3>
          <span className="font-mono text-[10px] text-muted uppercase">{new Date(comic.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/diary/new?edit=${comic.id}`} className="border border-ink/20 text-ink font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-yellow hover:border-yellow transition">Edit</Link>
          <button
            onClick={() => onDelete(comic.id, comic.title)}
            disabled={deleting === comic.id}
            className="border border-red-300 text-red-500 font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 transition"
          >
            {deleting === comic.id ? '...' : 'Del'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, count, action }: { title: string; count: number; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="font-barlow font-black text-3xl uppercase text-ink">{title}</h2>
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">{count} {count === 1 ? 'comic' : 'comics'}</span>
      </div>
      {action}
    </div>
  )
}

export default function Dashboard() {
  const [comics, setComics] = useState<Comic[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const supabase = createSupabaseClient()

  const handleDelete = async (comicId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(comicId)
    try {
      const res = await fetch('/api/delete-comic', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comicId }) })
      if (!res.ok) throw new Error('Delete failed')
      setComics(prev => prev.filter(c => c.id !== comicId))
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('folders').insert({ user_id: user.id, name: newFolderName.trim() }).select().single()
      if (error) throw error
      setFolders(prev => [...prev, data])
      setNewFolderName('')
      setShowNewFolderInput(false)
    } catch (err: any) {
      alert(`Failed to create folder: ${err.message}`)
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? Comics inside will move to Diary.')) return
    try {
      await supabase.from('folders').delete().eq('id', folderId)
      setFolders(prev => prev.filter(f => f.id !== folderId))
      setComics(prev => prev.map(c => c.folder_id === folderId ? { ...c, folder_id: null, comic_type: 'diary' } : c))
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const [{ data: comicsData }, { data: foldersData }] = await Promise.all([
          supabase.from('comics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('folders').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
        ])

        setComics(comicsData || [])
        setFolders(foldersData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [supabase])

  const diaryComics = comics.filter(c => (c as any).comic_type === 'diary' || !(c as any).comic_type)
  const highlightComics = comics.filter(c => (c as any).comic_type === 'highlight')
  const weekGroups = groupByWeek(diaryComics)

  return (
    <main className="min-h-screen bg-cream px-6 md:px-9 py-12 mt-[54px]">
      <div className="max-w-7xl mx-auto flex flex-col gap-16">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight text-ink">YOUR COMICS</h1>
          <Link href="/profile" className="border border-ink/20 text-ink font-mono text-[10px] tracking-wider uppercase px-5 py-2.5 rounded-full transition hover:bg-ink hover:text-white">
            MY PROFILE →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-16">

            {/* ── DIARY SECTION ── */}
            <section className="flex flex-col gap-8">
              <SectionHeader
                title="DIARY"
                count={diaryComics.length}
                action={
                  <Link href="/diary/new?type=diary" className="bg-yellow text-ink font-mono text-[10px] font-bold uppercase px-5 py-2.5 rounded-full hover:bg-[#c8dc38] transition">
                    + NEW DIARY ENTRY
                  </Link>
                }
              />
              {diaryComics.length === 0 ? (
                <div className="border-2 border-dashed border-ink/10 rounded-card p-12 flex flex-col items-center gap-4 text-center">
                  <span className="font-barlow font-bold text-xl uppercase text-ink/30">No diary entries yet</span>
                  <span className="font-dm text-sm text-muted">Start writing your daily story.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  {Object.entries(weekGroups).map(([weekLabel, weekComics]) => (
                    <div key={weekLabel} className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{weekLabel}</span>
                        <div className="flex-1 h-px bg-ink/10" />
                        <span className="font-mono text-[10px] text-muted">{weekComics.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {weekComics.map(comic => <ComicCard key={comic.id} comic={comic} onDelete={handleDelete} deleting={deleting} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="h-px bg-ink/10" />

            {/* ── HIGHLIGHTS SECTION ── */}
            <section className="flex flex-col gap-8">
              <SectionHeader
                title="HIGHLIGHTS"
                count={highlightComics.length}
                action={
                  <Link href="/diary/new?type=highlight" className="bg-ink text-white font-mono text-[10px] font-bold uppercase px-5 py-2.5 rounded-full hover:bg-muted transition">
                    + NEW HIGHLIGHT
                  </Link>
                }
              />
              {highlightComics.length === 0 ? (
                <div className="border-2 border-dashed border-ink/10 rounded-card p-12 flex flex-col items-center gap-4 text-center">
                  <span className="font-barlow font-bold text-xl uppercase text-ink/30">No highlights yet</span>
                  <span className="font-dm text-sm text-muted">Commemorate a special moment or achievement.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {highlightComics.map(comic => <ComicCard key={comic.id} comic={comic} onDelete={handleDelete} deleting={deleting} />)}
                </div>
              )}
            </section>

            <div className="h-px bg-ink/10" />

            {/* ── CUSTOM FOLDERS SECTION ── */}
            <section className="flex flex-col gap-8">
              <SectionHeader
                title="FOLDERS"
                count={folders.length}
                action={
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="border border-ink/30 text-ink font-mono text-[10px] font-bold uppercase px-5 py-2.5 rounded-full hover:border-ink transition"
                  >
                    + NEW FOLDER
                  </button>
                }
              />

              {showNewFolderInput && (
                <div className="flex items-center gap-3 max-w-sm">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName('') } }}
                    placeholder="Folder name..."
                    className="flex-1 bg-white border border-ink/20 rounded-full px-5 py-2.5 font-dm text-sm outline-none focus:border-yellow"
                  />
                  <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} className="bg-yellow text-ink font-mono text-[10px] font-bold uppercase px-5 py-2.5 rounded-full disabled:opacity-50 hover:bg-[#c8dc38] transition">
                    {creatingFolder ? '...' : 'CREATE'}
                  </button>
                  <button onClick={() => { setShowNewFolderInput(false); setNewFolderName('') }} className="text-ink/40 font-mono text-[9px] uppercase hover:text-ink transition">Cancel</button>
                </div>
              )}

              {folders.length === 0 && !showNewFolderInput ? (
                <div className="border-2 border-dashed border-ink/10 rounded-card p-12 flex flex-col items-center gap-4 text-center">
                  <span className="font-barlow font-bold text-xl uppercase text-ink/30">No folders yet</span>
                  <span className="font-dm text-sm text-muted">Organise comics into custom collections.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {folders.map(folder => {
                    const folderComics = comics.filter(c => (c as any).folder_id === folder.id)
                    const isExpanded = expandedFolder === folder.id
                    return (
                      <div key={folder.id} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between bg-white border border-ink/10 rounded-card px-6 py-4">
                          <button onClick={() => setExpandedFolder(isExpanded ? null : folder.id)} className="flex items-center gap-3 flex-1 text-left">
                            <span className="font-mono text-[11px] text-ink/30 transition-transform duration-200" style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                            <span className="font-barlow font-bold text-xl uppercase text-ink">{folder.name}</span>
                            <span className="font-mono text-[10px] text-muted">{folderComics.length} comics</span>
                          </button>
                          <div className="flex items-center gap-3">
                            <Link href={`/diary/new?type=custom&folder=${folder.id}`} className="bg-yellow text-ink font-mono text-[9px] font-bold uppercase px-4 py-2 rounded-full hover:bg-[#c8dc38] transition">
                              + ADD COMIC
                            </Link>
                            <button onClick={() => handleDeleteFolder(folder.id)} className="text-ink/20 hover:text-red-500 font-mono text-[9px] uppercase transition">
                              Delete
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="pl-4">
                            {folderComics.length === 0 ? (
                              <p className="font-dm text-sm text-muted italic px-2">No comics in this folder yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {folderComics.map(comic => <ComicCard key={comic.id} comic={comic} onDelete={handleDelete} deleting={deleting} />)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </main>
  )
}
