'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setCheckingSession(false)

      if (!session) {
        setError('Your reset link is invalid or expired. Please request a new one.')
      }
    })

    return () => {
      mounted = false
    }
  }, [supabase])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-ink p-8 rounded-card shadow-sm">
        <h1 className="font-barlow font-black text-3xl uppercase tracking-tight text-ink mb-3 text-center">
          NEW PASSWORD
        </h1>
        <p className="font-dm text-sm text-muted text-center mb-6">
          Choose a fresh password for your ComicLife account.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-[11px] font-mono uppercase p-3 rounded mb-4 border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 text-[11px] font-mono uppercase p-3 rounded mb-4 border border-green-200">
            Password updated. Redirecting...
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase text-muted mb-1.5">NEW PASSWORD</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full border border-ink/20 rounded-full px-4 py-2.5 font-dm text-sm outline-none focus:border-yellow"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={checkingSession || success}
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase text-muted mb-1.5">CONFIRM PASSWORD</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full border border-ink/20 rounded-full px-4 py-2.5 font-dm text-sm outline-none focus:border-yellow"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={checkingSession || success}
            />
          </div>

          <button
            type="submit"
            disabled={checkingSession || loading || success}
            className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3.5 rounded-full mt-2 hover:bg-[#c8dc38] transition disabled:opacity-50"
          >
            {checkingSession ? 'CHECKING LINK...' : loading ? 'UPDATING...' : 'UPDATE PASSWORD ->'}
          </button>
        </form>

        <p className="mt-6 text-center font-dm text-xs text-muted">
          Need another link? <Link href="/auth/forgot-password" className="text-ink font-bold hover:underline">REQUEST RESET</Link>
        </p>
      </div>
    </main>
  )
}
