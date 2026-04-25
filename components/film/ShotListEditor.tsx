'use client'

import ShotCard from './ShotCard'
import { useFilmStore } from '../../store/useFilmStore'

interface Props {
  comicId: string
}

export default function ShotListEditor({ comicId }: Props) {
  const { shotList, reorderShots } = useFilmStore()

  if (!shotList) return null

  const move = (idx: number, dir: -1 | 1) => {
    const ids = shotList.shots.map((s) => s.id)
    const target = idx + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[idx], ids[target]] = [ids[target], ids[idx]]
    reorderShots(ids)
  }

  const totalDuration = shotList.shots.reduce((acc, s) => acc + s.duration, 0)
  const readyCount = shotList.shots.filter((s) => s.status === 'ready').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-barlow font-black text-2xl uppercase tracking-tight text-ink">
            {shotList.title}
          </h2>
          <p className="font-mono text-[10px] uppercase text-muted tracking-widest mt-1">
            {shotList.shots.length} shots · {totalDuration}s · {shotList.style}
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink">
          <span className="text-yellow font-bold">{readyCount}</span>
          <span className="text-muted"> / {shotList.shots.length} ready</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {shotList.shots.map((shot, i) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            index={i}
            comicId={comicId}
            previousShot={i > 0 ? shotList.shots[i - 1] : undefined}
            onMoveUp={i > 0 ? () => move(i, -1) : undefined}
            onMoveDown={i < shotList.shots.length - 1 ? () => move(i, 1) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
