'use client'

import { Panel } from '../../types'
import ComicPanel from './ComicPanel'

interface ComicGridProps {
  panels: Panel[]
  editable?: boolean
}

export default function ComicGrid({ panels, editable = false }: ComicGridProps) {
  // Asymmetric CSS grid for comic layout feeling
  return (
    <div className="grid grid-cols-2 gap-2 p-2 bg-ink rounded-card">
      {panels.map((panel, i) => {
        // Pattern: [wide, narrow, narrow] then [narrow, narrow, wide]
        // This is a simplified version; in a real app, you'd use a more complex grid-template-areas or varying col-spans.
        const isWide = i % 3 === 0
        return (
          <div key={panel.id} className={isWide ? "col-span-2" : "col-span-1"}>
            <ComicPanel panel={panel} editable={editable} index={i} />
          </div>
        )
      })}
    </div>
  )
}
