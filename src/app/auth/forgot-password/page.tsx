'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-ink p-8 rounded-card shadow-sm">
        <h1 className="font-barlow font-black text-3xl uppercase tracking-tight text-ink mb-3 text-center">
          RESET PASSWORD
        </h1>
        <p className="font-dm text-sm text-muted text-center mb-6">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-[11px] font-mono uppercase p-3 rounded mb-4 border border-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-6">
            <h2 className="font-dm font-bold text-ink mb-2 text-lg">Check your email</h2>
            <p className="font-dm text-muted text-sm px-4">
              If an account exists for that address, the reset link is on its way.
            </p>
            <Link href="/auth/login" className="inline-block bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3 px-8 rounded-full mt-8 hover:bg-[#c8dc38] transition">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleResetRequest} className="flex flex-col gap-4">
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

              <button
                type="submit"
                disabled={loading}
                className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3.5 rounded-full mt-2 hover:bg-[#c8dc38] transition disabled:opacity-50"
              >
                {loading ? 'SENDING LINK...' : 'SEND RESET LINK ->'}
              </button>
            </form>

            <p className="mt-6 text-center font-dm text-xs text-muted">
              Remembered it? <Link href="/auth/login" className="text-ink font-bold hover:underline">LOG IN</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
