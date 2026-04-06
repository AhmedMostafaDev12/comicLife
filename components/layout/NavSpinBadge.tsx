'use client'

export default function NavSpinBadge() {
  return (
    <span
      className="inline-block text-yellow font-bold text-lg"
      style={{ animation: 'spin 4s linear infinite' }}
    >
      ★
    </span>
  )
}
