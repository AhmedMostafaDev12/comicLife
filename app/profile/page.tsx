'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '../../lib/supabase'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [description, setDescription] = useState('')
  const [characters, setCharacters] = useState<any[]>([])
  
  // Character Creation State
  const [isAddingChar, setIsAddingChar] = useState(false)
  const [newCharStatus, setNewCharStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [newCharName, setNewCharName] = useState('')
  const [newCharImage, setNewCharImage] = useState<File | null>(null)
  const [newCharPreview, setNewCharPreview] = useState<string | null>(null)
  const charFileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createSupabaseClient()

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setUsername(profileData.username || '')
          setFullName(profileData.full_name || '')
          setDescription(profileData.character_description || '')
        }

        const { data: charData } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        
        setCharacters(charData || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfileData()
  }, [supabase])

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          username,
          full_name: fullName,
          character_description: description,
          email: user.email,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  const handleCharFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewCharImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setNewCharPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCreateAICharacter = async () => {
    if (!newCharName || !newCharImage) {
      alert('Please provide a name and a photo.')
      return
    }

    setNewCharStatus('processing')
    const formData = new FormData()
    formData.append('image', newCharImage)
    formData.append('name', newCharName)
    formData.append('style', 'painterly')

    try {
      const response = await fetch('/api/create-character', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('AI Character Creation failed')
      
      const data = await response.json()
      setCharacters([...characters, data.character])
      
      // Reset
      setIsAddingChar(false)
      setNewCharName('')
      setNewCharImage(null)
      setNewCharPreview(null)
      setNewCharStatus('idle')
    } catch (err: any) {
      console.error(err)
      alert(`Error: ${err.message}`)
      setNewCharStatus('idle')
    }
  }

  const handleDeleteCharacter = async (id: string) => {
    if (!confirm('Are you sure you want to remove this character?')) return
    try {
      await supabase.from('characters').delete().eq('id', id)
      setCharacters(characters.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-[10px] uppercase tracking-widest">Loading Profile...</div>

  return (
    <main className="min-h-screen bg-cream px-6 md:px-9 py-12 mt-[54px]">
      <div className="max-w-5xl mx-auto flex flex-col gap-12">
        
        <div className="flex items-center justify-between">
          <h1 className="font-barlow font-black text-4xl md:text-[52px] uppercase text-ink">MY PROFILE</h1>
          <button 
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            className="bg-yellow text-ink font-mono text-[11px] font-bold px-8 py-3 rounded-full hover:bg-[#c8dc38] transition"
          >
            {isEditing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* USER AVATAR */}
          <div className="flex flex-col gap-6">
            <div className="aspect-square rounded-[20px] bg-ink overflow-hidden border-4 border-white shadow-xl relative group">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 font-mono text-[10px] uppercase">No Avatar</div>
              )}
              <Link href="/avatar" className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-yellow font-mono text-[10px] font-bold uppercase">Change Avatar</Link>
            </div>
            <div className="bg-white border border-ink/10 p-4 rounded-[12px] text-center">
               <span className="block font-mono text-[9px] uppercase text-muted mb-1">ACCOUNT EMAIL</span>
               <span className="font-dm text-sm font-bold text-ink">{(profile as any)?.email}</span>
            </div>
          </div>

          {/* USER DETAILS */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase text-muted">FULL NAME</label>
              {isEditing ? (
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white border border-ink/20 rounded-full px-6 py-3 font-dm text-lg outline-none focus:border-yellow" />
              ) : (
                <span className="font-barlow font-bold text-3xl uppercase text-ink">{fullName || 'NO NAME SET'}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase text-muted">TAG</label>
              {isEditing ? (
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-white border border-ink/20 rounded-full px-6 py-3 font-dm text-lg outline-none focus:border-yellow" />
              ) : (
                <span className="font-dm font-bold text-ink/60">@{username || 'user'}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase text-muted">MY CHARACTER DESCRIPTION</label>
              {isEditing ? (
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white border border-ink/20 rounded-[16px] px-6 py-4 font-dm text-sm h-[150px] resize-none outline-none" />
              ) : (
                <p className="font-dm text-muted leading-relaxed italic bg-white/50 p-6 rounded-[16px] border border-dashed border-ink/10">&quot;{description}&quot;</p>
              )}
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="w-fit text-red-500 font-mono text-[10px] uppercase tracking-widest hover:underline">Sign Out</button>
          </div>
        </div>

        {/* CHARACTER CAST */}
        <div className="mt-16 pt-12 border-t border-ink/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="font-barlow font-black text-4xl uppercase text-ink">MY CAST</h2>
              <p className="font-dm text-muted text-sm text-balance">Add your friends, family, or rivals using AI. Upload a photo and let the AI draw them.</p>
            </div>
            {!isAddingChar && (
              <button onClick={() => setIsAddingChar(true)} className="bg-ink text-white font-mono text-[10px] font-bold px-6 py-3 rounded-full hover:bg-muted transition">+ ADD AI CHARACTER</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isAddingChar && (
              <div className="bg-white border-2 border-yellow p-6 rounded-[20px] flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-200">
                <input 
                  placeholder="Character Name (e.g. Sarah)"
                  className="bg-cream/30 border border-ink/10 rounded-full px-5 py-2.5 font-dm text-sm outline-none focus:border-yellow"
                  value={newCharName}
                  onChange={e => setNewCharName(e.target.value)}
                />
                
                <input type="file" ref={charFileInputRef} onChange={handleCharFileChange} className="hidden" accept="image/*" />
                <div 
                  onClick={() => charFileInputRef.current?.click()}
                  className="aspect-square bg-cream/20 border-2 border-dashed border-ink/10 rounded-[14px] flex items-center justify-center cursor-pointer hover:border-yellow transition-colors overflow-hidden"
                >
                  {newCharPreview ? (
                    <img src={newCharPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <span className="font-mono text-[9px] uppercase text-ink/30">Click to upload photo</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleCreateAICharacter} 
                    disabled={newCharStatus === 'processing' || !newCharName || !newCharImage}
                    className="bg-yellow text-ink font-mono text-[10px] font-bold py-3 rounded-full disabled:opacity-50"
                  >
                    {newCharStatus === 'processing' ? 'AI IS DRAWING...' : 'CREATE CHARACTER'}
                  </button>
                  <button onClick={() => { setIsAddingChar(false); setNewCharPreview(null); }} className="text-ink/40 font-mono text-[9px] uppercase py-2">Cancel</button>
                </div>
              </div>
            )}

            {characters.map(char => (
              <div key={char.id} className="bg-white border border-ink/5 p-4 rounded-[20px] flex flex-col gap-4 relative group hover:shadow-lg transition-shadow">
                <button onClick={() => handleDeleteCharacter(char.id)} className="absolute top-3 right-3 text-ink/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                <div className="aspect-[4/3] rounded-[12px] bg-ink overflow-hidden border border-ink/5">
                  {char.avatar_url ? <img src={char.avatar_url} className="w-full h-full object-cover" alt={char.name} /> : <div className="w-full h-full bg-ink/10" />}
                </div>
                <div className="px-1 flex flex-col gap-1">
                  <span className="font-barlow font-bold text-2xl uppercase text-ink leading-none">{char.name}</span>
                  <p className="font-dm text-muted text-[11px] leading-relaxed italic line-clamp-2">&quot;{char.description}&quot;</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
