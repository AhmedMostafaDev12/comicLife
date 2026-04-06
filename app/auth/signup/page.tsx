'use client'

import { useState } from 'react'
import { createSupabaseClient } from '../../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createSupabaseClient()
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName
        }
      }
    })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // If data.session is present, they are logged in automatically (confirmation is off)
      if (data.session) {
        router.push('/dashboard')
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-ink p-8 rounded-card shadow-sm">
        <h1 className="font-barlow font-black text-3xl uppercase tracking-tight text-ink mb-6 text-center">
          CREATE ACCOUNT
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 text-[11px] font-mono uppercase p-3 rounded mb-4 border border-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <h2 className="font-dm font-bold text-ink mb-2 text-lg">Check your email!</h2>
            <p className="font-dm text-muted text-sm px-6">
              We've sent a verification link to your email. Once confirmed, you can start building comics.
            </p>
            <Link href="/auth/login" className="inline-block bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3 px-8 rounded-full mt-8 hover:bg-[#c8dc38] transition">
              GO TO LOGIN
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-muted mb-1.5">FULL NAME</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-ink/20 rounded-full px-4 py-2.5 font-dm text-sm outline-none focus:border-yellow"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-muted mb-1.5">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  required
                  className="w-full border border-ink/20 rounded-full px-4 py-2.5 font-dm text-sm outline-none focus:border-yellow"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-muted mb-1.5">PASSWORD</label>
                <input 
                  type="password" 
                  required
                  className="w-full border border-ink/20 rounded-full px-4 py-2.5 font-dm text-sm outline-none focus:border-yellow"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3.5 rounded-full mt-2 hover:bg-[#c8dc38] transition disabled:opacity-50"
              >
                {loading ? 'CREATING ACCOUNT...' : 'SIGN UP →'}
              </button>
            </form>
            
            <p className="mt-6 text-center font-dm text-xs text-muted">
              Already have an account? <Link href="/auth/login" className="text-ink font-bold hover:underline">LOG IN</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
