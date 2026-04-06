'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ComicPanel from './ComicPanel'
import { Panel } from '../../types'

interface SortablePanelProps {
  panel: Panel
  index: number
  editable: boolean
  isWide: boolean
  onUpdate: (id: string, updates: Partial<Panel>) => void
  onRegenerate: (id: string) => void
}

export default function SortablePanel({ 
  panel, 
  index, 
  editable, 
  isWide,
  onUpdate,
  onRegenerate 
}: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: panel.id, disabled: !editable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={isWide ? "col-span-2" : "col-span-1"}
    >
      <div className="relative group">
        {editable && (
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-2 left-2 z-30 p-1.5 bg-ink/80 text-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        )}
        <ComicPanel 
          panel={panel} 
          index={index} 
          editable={editable} 
          onUpdate={onUpdate}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  )
}
