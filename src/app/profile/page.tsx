'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy'>('profile')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [characters, setCharacters] = useState<any[]>([])

  // Character Creation State
  const [isAddingChar, setIsAddingChar] = useState(false)
  const [newCharStatus, setNewCharStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [charSaveSuccess, setCharSaveSuccess] = useState(false)
  const [newCharName, setNewCharName] = useState('')
  const [newCharStyle, setNewCharStyle] = useState('painterly')
  const [newCharImage, setNewCharImage] = useState<File | null>(null)
  const [newCharPreview, setNewCharPreview] = useState<string | null>(null)
  const [customStyleRef, setCustomStyleRef] = useState<File | null>(null)
  const [customStylePreview, setCustomStylePreview] = useState<string | null>(null)
  const [removingAvatar, setRemovingAvatar] = useState(false)
  const charFileInputRef = useRef<HTMLInputElement>(null)
  const charStyleFileRef = useRef<HTMLInputElement>(null)

  const STYLES = [
    { id: 'painterly', name: 'Painterly' },
    { id: 'manga', name: 'Manga' },
    { id: 'comic_book', name: 'Comic Book' },
    { id: 'noir', name: 'Noir' },
    { id: 'webtoon', name: 'Webtoon' },
    { id: 'retro_pop', name: 'Retro Pop' },
    { id: 'sketch', name: 'Sketch' },
    { id: 'watercolor', name: 'Watercolor' },
  ]

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
          email: user.email,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
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
    formData.append('style', newCharStyle)
    if (newCharStyle === 'custom' && customStyleRef) {
      formData.append('style_reference', customStyleRef)
    }

    try {
      const response = await fetch('/api/create-character', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('AI Character Creation failed')

      const data = await response.json()
      setCharacters([...characters, data.character])
      setIsAddingChar(false)
      setNewCharName('')
      setNewCharStyle('painterly')
      setNewCharImage(null)
      setNewCharPreview(null)
      setCustomStyleRef(null)
      setCustomStylePreview(null)
      setNewCharStatus('idle')
      setCharSaveSuccess(true)
      setTimeout(() => setCharSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error(err)
      alert(`Error: ${err.message}`)
      setNewCharStatus('idle')
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your avatar? You can always create a new one.')) return
    setRemovingAvatar(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('users').update({ avatar_url: null }).eq('id', user.id)
      setProfile((p: any) => ({ ...p, avatar_url: null }))
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setRemovingAvatar(false)
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

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center font-mono text-[10px] uppercase tracking-widest">
      Loading Profile...
    </div>
  )

  return (
    <main className="min-h-screen bg-cream px-6 md:px-9 py-12 mt-[54px]">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">

        {/* PAGE HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="font-barlow font-black text-4xl md:text-[52px] uppercase text-ink">PROFILE</h1>
          {saveSuccess && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-green-600 flex items-center gap-2">
              <span>✓</span> Saved
            </span>
          )}
          {charSaveSuccess && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-green-600 flex items-center gap-2">
              <span>✓</span> Character added
            </span>
          )}
        </div>

        {/* TABS */}
        <div className="flex bg-ink p-1.5 rounded-full w-fit gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-full font-mono text-[10px] tracking-wider uppercase transition-colors ${
              activeTab === 'profile' ? 'bg-yellow text-ink font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            MY PROFILE
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-6 py-2 rounded-full font-mono text-[10px] tracking-wider uppercase transition-colors ${
              activeTab === 'privacy' ? 'bg-yellow text-ink font-bold' : 'text-white/60 hover:text-white'
            }`}
          >
            PRIVACY POLICY
          </button>
        </div>

        {/* ── MY PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <>
            <div className="flex justify-end">
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
                  <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <Link
                      href="/avatar"
                      className="bg-yellow text-ink font-mono text-[10px] font-bold uppercase px-5 py-2 rounded-full hover:bg-[#c8dc38] transition"
                    >
                      {profile?.avatar_url ? 'EDIT AVATAR' : 'ADD AVATAR'}
                    </Link>
                    {profile?.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={removingAvatar}
                        className="border border-red-400 text-red-400 font-mono text-[9px] font-bold uppercase px-4 py-1.5 rounded-full hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 transition"
                      >
                        {removingAvatar ? 'Removing...' : 'Remove Avatar'}
                      </button>
                    )}
                  </div>
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
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-white border border-ink/20 rounded-full px-6 py-3 font-dm text-lg outline-none focus:border-yellow"
                      placeholder="Your full name"
                    />
                  ) : (
                    <span className="font-barlow font-bold text-3xl uppercase text-ink">
                      {fullName || <span className="text-ink/30">NO NAME SET</span>}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase text-muted">TAG</label>
                  {isEditing ? (
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-white border border-ink/20 rounded-full px-6 py-3 font-dm text-lg outline-none focus:border-yellow"
                      placeholder="username"
                    />
                  ) : (
                    <span className="font-dm font-bold text-ink/60">@{username || 'user'}</span>
                  )}
                </div>
                <button
                  onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
                  className="w-fit text-red-500 font-mono text-[10px] uppercase tracking-widest hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* CHARACTER CAST */}
            <div className="mt-8 pt-12 border-t border-ink/10">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="font-barlow font-black text-4xl uppercase text-ink">MY CAST</h2>
                  <p className="font-dm text-muted text-sm max-w-md">
                    Add your friends, family, and rivals to your cast — upload a photo and let the AI draw them.
                  </p>
                </div>
                {!isAddingChar && (
                  <button
                    onClick={() => setIsAddingChar(true)}
                    className="bg-ink text-white font-mono text-[10px] font-bold px-6 py-3 rounded-full hover:bg-muted transition shrink-0"
                  >
                    + ADD TO CAST
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isAddingChar && (
                  <div className="bg-white border-2 border-yellow p-6 rounded-[20px] flex flex-col gap-5 shadow-2xl">
                    <input
                      placeholder="Character Name (e.g. Sarah)"
                      className="bg-cream/30 border border-ink/10 rounded-full px-5 py-2.5 font-dm text-sm outline-none focus:border-yellow"
                      value={newCharName}
                      onChange={e => setNewCharName(e.target.value)}
                    />

                    <input type="file" ref={charFileInputRef} onChange={handleCharFileChange} className="hidden" accept="image/*" />
                    <div
                      onClick={() => charFileInputRef.current?.click()}
                      className="aspect-[4/3] bg-cream/20 border-2 border-dashed border-ink/10 rounded-[14px] flex items-center justify-center cursor-pointer hover:border-yellow transition-colors overflow-hidden"
                    >
                      {newCharPreview ? (
                        <img src={newCharPreview} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <span className="font-mono text-[9px] uppercase text-ink/30">Click to upload photo</span>
                      )}
                    </div>

                    <input type="file" ref={charStyleFileRef} onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setCustomStyleRef(f)
                        setNewCharStyle('custom')
                        const r = new FileReader()
                        r.onloadend = () => setCustomStylePreview(r.result as string)
                        r.readAsDataURL(f)
                      }
                    }} className="hidden" accept="image/*" />
                    <div className="flex flex-col gap-1.5">
                      <span className="font-mono text-[8px] uppercase text-ink/40 tracking-widest">Style</span>
                      <div className="flex flex-wrap gap-1.5">
                        {STYLES.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setNewCharStyle(s.id)}
                            className={`px-3 py-1.5 rounded-full font-mono text-[8px] uppercase tracking-wider transition-all ${
                              newCharStyle === s.id
                                ? 'bg-yellow text-ink font-bold border border-yellow'
                                : 'bg-white border border-ink/10 text-ink/50 hover:border-ink/30'
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                        <button
                          onClick={() => charStyleFileRef.current?.click()}
                          className={`px-3 py-1.5 rounded-full font-mono text-[8px] uppercase tracking-wider transition-all flex items-center gap-1 ${
                            newCharStyle === 'custom'
                              ? 'bg-yellow text-ink font-bold border border-yellow'
                              : 'bg-white border border-dashed border-ink/20 text-ink/50 hover:border-yellow'
                          }`}
                        >
                          {customStylePreview ? (
                            <img src={customStylePreview} className="w-4 h-4 rounded-sm object-cover" alt="" />
                          ) : (
                            <span>+</span>
                          )}
                          Custom
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleCreateAICharacter}
                        disabled={newCharStatus === 'processing' || !newCharName || !newCharImage}
                        className="bg-yellow text-ink font-mono text-[10px] font-bold py-3 rounded-full disabled:opacity-50"
                      >
                        {newCharStatus === 'processing' ? 'AI IS DRAWING...' : 'CREATE CHARACTER'}
                      </button>
                      <button
                        onClick={() => { setIsAddingChar(false); setNewCharPreview(null); setNewCharName(''); setNewCharStyle('painterly') }}
                        className="text-ink/40 font-mono text-[9px] uppercase py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {characters.map(char => (
                  <div key={char.id} className="bg-white border border-ink/5 p-4 rounded-[20px] flex flex-col gap-4 relative group hover:shadow-lg transition-shadow">
                    <button
                      onClick={() => handleDeleteCharacter(char.id)}
                      className="absolute top-3 right-3 text-ink/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="aspect-[4/3] rounded-[12px] bg-ink overflow-hidden border border-ink/5">
                      {char.avatar_url
                        ? <img src={char.avatar_url} className="w-full h-full object-cover" alt={char.name} />
                        : <div className="w-full h-full bg-ink/10" />
                      }
                    </div>
                    <div className="px-1 flex flex-col gap-1">
                      <span className="font-barlow font-bold text-2xl uppercase text-ink leading-none">{char.name}</span>
                      <p className="font-dm text-muted text-[11px] leading-relaxed italic line-clamp-2">&quot;{char.description}&quot;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── PRIVACY POLICY TAB ── */}
        {activeTab === 'privacy' && (
          <div className="max-w-2xl flex flex-col gap-10 pb-16">
            <div>
              <p className="font-mono text-[10px] uppercase text-muted tracking-widest mb-1">Last Updated: May 2026</p>
              <h2 className="font-barlow font-black text-3xl uppercase text-ink">Privacy Policy</h2>
            </div>

            {[
              {
                title: '1. Introduction',
                body: 'ComicLife ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our application. Please read it carefully.'
              },
              {
                title: '2. What Data We Collect',
                body: null,
                bullets: [
                  'Account Information: When you register, we collect your name and email address. Your email is used solely for authentication, verification, password reset, and transactional communications.',
                  'Profile Photo: You may upload a photo of yourself and others to generate comic-style characters using AI. These photos are processed to generate your avatar and cast members.',
                  'Usage Data: We may collect anonymized data about how the app is used (e.g., features accessed, session duration) to improve the product. This data is never linked to your identity.'
                ]
              },
              {
                title: '3. What We Do NOT Collect or Store',
                body: null,
                bullets: [
                  'Your Comics: All comics you create are stored locally on your device only. ComicLife does not upload, store, or have access to any of your comic content, diary entries, stories, or personal narratives on our servers.',
                  'Your Diary: All diary entries, written stories, and personal reflections remain entirely on your device. We have no access to this content under any circumstances.',
                  'We do not sell your data. We do not share your personal information with third-party advertisers.'
                ]
              },
              {
                title: '4. AI Processing',
                body: 'ComicLife uses third-party AI services (including Google Gemini) to generate comic-style images from your uploaded photos and to process the stories you write into comic panels. By using the app, you acknowledge that your uploaded photos and story text may be sent to these AI providers for processing. Please review the respective privacy policies of these providers for details on how they handle submitted data.'
              },
              {
                title: '5. Sharing',
                body: 'Your diary comics are private by default and are never shared without your explicit action. If you choose to share a comic, that sharing is performed by you and is entirely your choice. ComicLife does not automatically make any content public.'
              },
              {
                title: '6. Data Retention & Deletion',
                body: null,
                bullets: [
                  'Since your comic content is stored locally on your device, deleting the app removes all locally stored content.',
                  'To delete your account and associated account data (name, email), contact us at support@comiclife.app. We will process your deletion request within 30 days.'
                ]
              },
              {
                title: '7. Security',
                body: 'We take reasonable technical measures to protect your account information. However, no system is completely secure. We encourage you to use a strong password and to keep your login credentials private.'
              },
              {
                title: '8. Children',
                body: 'ComicLife is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal data, we will delete it promptly.'
              },
              {
                title: '9. Changes to This Policy',
                body: 'We may update this Privacy Policy from time to time. We will notify you of any material changes via the app or by email. Continued use of the app after changes constitutes acceptance of the updated policy.'
              },
              {
                title: '10. Contact Us',
                body: 'If you have questions about this Privacy Policy or wish to make a complaint:',
                bullets: [
                  'Email: support@comiclife.app',
                  'In-App: Use the Send a Complaint button to contact our team directly.'
                ]
              }
            ].map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <h3 className="font-barlow font-black text-xl uppercase text-ink">{section.title}</h3>
                {section.body && <p className="font-dm text-ink/70 leading-relaxed text-sm">{section.body}</p>}
                {section.bullets && (
                  <ul className="flex flex-col gap-2">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="font-dm text-ink/70 text-sm leading-relaxed flex gap-3">
                        <span className="text-yellow font-bold mt-0.5 shrink-0">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
