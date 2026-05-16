'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const supabase = useMemo(() => createSupabaseClient(), [])
  const router = useRouter()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setVerifying(true)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setError(error.message)
      setVerifying(false)
      return
    }

    if (!data.session) {
      setError('The code was accepted, but no session was created. Please log in.')
      setVerifying(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleResend = async () => {
    setError(null)
    setMessage(null)

    if (!email) {
      setError('Enter your email address first.')
      return
    }

    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('A new verification code has been sent.')
    }

    setResending(false)
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-ink p-8 rounded-card shadow-sm">
        <h1 className="font-barlow font-black text-3xl uppercase tracking-tight text-ink mb-3 text-center">
          VERIFY EMAIL
        </h1>
        <p className="font-dm text-muted text-sm text-center mb-6">
          Enter the 6-digit code we sent to your email.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-[11px] font-mono uppercase p-3 rounded mb-4 border border-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-700 text-[11px] font-mono uppercase p-3 rounded mb-4 border border-green-200">
            {message}
          </div>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
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
            <label className="block font-mono text-[10px] uppercase text-muted mb-1.5">VERIFICATION CODE</label>
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="w-full border border-ink/20 rounded-full px-4 py-2.5 font-mono text-sm tracking-[0.3em] outline-none focus:border-yellow"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="bg-yellow text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3.5 rounded-full mt-2 hover:bg-[#c8dc38] transition disabled:opacity-50"
          >
            {verifying ? 'VERIFYING...' : 'VERIFY EMAIL'}
          </button>
        </form>

        <button
          type="button"
          disabled={resending}
          onClick={handleResend}
          className="w-full mt-4 border border-ink/20 text-ink font-mono text-[11px] font-bold tracking-wider uppercase py-3 rounded-full hover:border-yellow transition disabled:opacity-50"
        >
          {resending ? 'SENDING...' : 'RESEND CODE'}
        </button>

        <p className="mt-6 text-center font-dm text-xs text-muted">
          Already verified? <Link href="/auth/login" className="text-ink font-bold hover:underline">LOG IN</Link>
        </p>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  )
}
