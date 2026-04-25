'use client'

import type { FilmStage } from '../../types/film'

const STAGES: { key: FilmStage; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'keyframes', label: 'Keyframes' },
  { key: 'shots', label: 'Shots' },
  { key: 'audio', label: 'Audio' },
  { key: 'assemble', label: 'Assemble' },
]

interface Props {
  stage: FilmStage
  onJump: (s: FilmStage) => void
  reachedIndex: number
}

export default function StageStepper({ stage, onJump, reachedIndex }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage)
  return (
    <div className="flex bg-ink p-1.5 rounded-full w-full overflow-x-auto no-scrollbar">
      <div className="flex shrink-0 min-w-full justify-between sm:justify-start">
        {STAGES.map((s, i) => {
          const reached = i <= reachedIndex
          const active = i === currentIdx
          return (
            <button
              key={s.key}
              onClick={() => reached && onJump(s.key)}
              disabled={!reached}
              className={`px-4 sm:px-6 py-2 rounded-full font-mono text-[9px] sm:text-[10px] tracking-wider uppercase transition-colors whitespace-nowrap ${
                active
                  ? 'bg-yellow text-ink font-bold'
                  : reached
                    ? 'text-white hover:text-yellow'
                    : 'text-white/30 cursor-not-allowed'
              }`}
            >
              0{i + 1} {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
