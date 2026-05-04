'use client'

interface SpinBadgeProps {
  centerText: string[]
  size?: number
}

export default function SpinBadge({ centerText, size = 160 }: SpinBadgeProps) {
  const radius = size / 2.5
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Rotating SVG Text */}
      <svg 
        className="absolute inset-0 w-full h-full animate-spin-slow" 
        viewBox={`0 0 ${size} ${size}`}
      >
        <path
          id="text-path"
          d={`M ${size/2}, ${size/2} m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius*2},0 a ${radius},${radius} 0 1,1 -${radius*2},0`}
          fill="none"
        />
        <text className="font-mono text-[10px] uppercase tracking-widest fill-ink">
          <textPath href="#text-path" startOffset="0">
            ✦ AI POWERED COMIC GENERATOR ✦ YOUR LIFE AS COMICS 
          </textPath>
        </text>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center font-barlow font-black text-xl leading-none uppercase tracking-widest">
        {centerText.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>
    </div>
  )
}
