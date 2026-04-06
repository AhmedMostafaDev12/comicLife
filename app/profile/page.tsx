'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '../../lib/supabase'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [description, setDescription] = useState('')
  
  const supabase = createSupabaseClient()

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
          setUsername(data.username || '')
          setFullName(data.full_name || '')
          setDescription(data.character_description || '')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [supabase])

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('users')
        .update({
          username,
          full_name: fullName,
          character_description: description,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      setIsEditing(false)
      setProfile({ ...profile, username, full_name: fullName, character_description: description })
    } catch (err) {
      console.error(err)
      alert('Failed to update profile')
    }
  }

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-[10px] uppercase tracking-widest">Loading Profile...</div>

  return (
    <main className="min-h-screen bg-cream px-9 py-12 mt-[54px]">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        <div className="flex items-center justify-between">
          <h1 className="font-barlow font-black text-[52px] leading-none uppercase tracking-tight text-ink">
            MY PROFILE
          </h1>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase px-8 py-3 rounded-full hover:bg-[#c8dc38] transition"
          >
            {isEditing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* LEFT: Avatar Display */}
          <div className="flex flex-col gap-6">
            <div className="aspect-square rounded-[20px] bg-ink overflow-hidden border-4 border-white shadow-xl relative group">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 font-mono text-[10px] uppercase">No Avatar</div>
              )}
              <Link href="/avatar" className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-yellow font-mono text-[10px] font-bold uppercase">
                Change Avatar
              </Link>
            </div>
            <div className="bg-white border border-ink/10 p-4 rounded-[12px] text-center">
               <span className="block font-mono text-[9px] uppercase text-muted mb-1">ACCOUNT EMAIL</span>
               <span className="font-dm text-sm font-bold text-ink">{profile?.email || 'User'}</span>
            </div>
          </div>

          {/* RIGHT: Details */}
          <div className="md:col-span-2 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase text-muted">FULL NAME</label>
              {isEditing ? (
                <input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white border border-ink/20 rounded-full px-6 py-3 font-dm text-lg outline-none focus:border-yellow"
                  placeholder="Your Full Name"
                />
              ) : (
                <span className="font-barlow font-bold text-3xl uppercase text-ink">{profile?.full_name || 'NO NAME SET'}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase text-muted">USER NAME (TAG)</label>
              {isEditing ? (
                <input 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white border border-ink/20 rounded-full px-6 py-3 font-dm text-lg outline-none focus:border-yellow"
                  placeholder="username"
                />
              ) : (
                <span className="font-dm font-bold text-ink/60">@{profile?.username || 'user'}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase text-muted">CHARACTER DESCRIPTION (AI MEMORY)</label>
              {isEditing ? (
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white border border-ink/20 rounded-[16px] px-6 py-4 font-dm text-sm leading-relaxed outline-none focus:border-yellow h-[150px] resize-none"
                  placeholder="Describe how you want to look in comics..."
                />
              ) : (
                <p className="font-dm text-muted leading-relaxed italic bg-white/50 p-6 rounded-[16px] border border-dashed border-ink/10">
                  &quot;{profile?.character_description || 'No description set. Upload an avatar to generate one automatically.'}&quot;
                </p>
              )}
              <p className="font-mono text-[9px] text-muted uppercase mt-2">
                This description is used by the AI to keep your character consistent across all your comic stories.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-4">
               <button 
                 onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
                 className="w-fit text-red-500 font-mono text-[10px] uppercase tracking-widest hover:underline"
               >
                 Sign Out of Account
               </button>
            </div>
          </div>

        </div>

      </div>
    </main>
  )
}
