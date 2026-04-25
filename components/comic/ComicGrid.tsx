'use client'

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { Panel } from '../../types'
import SortablePanel from './SortablePanel'
import { useComicStore } from '../../store/useComicStore'

interface ComicGridProps {
  panels: Panel[]
  editable?: boolean
}

export default function ComicGrid({ panels, editable = false }: ComicGridProps) {
  const { setPanels, updatePanel } = useComicStore()
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = panels.findIndex((p) => p.id === active.id)
      const newIndex = panels.findIndex((p) => p.id === over.id)
      
      const newPanels = arrayMove(panels, oldIndex, newIndex).map((p, i) => ({
        ...p,
        order: i
      }))
      
      setPanels(newPanels)
    }
  }

  const handleUpdate = (id: string, updates: Partial<Panel>) => {
    updatePanel(id, updates)
  }

  const handleRegenerate = async (id: string) => {
    const panel = panels.find(p => p.id === id)
    if (!panel) return
    const { selectedStyle } = useComicStore.getState()

    updatePanel(id, { image_url: undefined } as any)

    try {
      const res = await fetch('/api/regenerate-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelId: id,
          prompt: panel.prompt_used || `Scene: ${panel.caption}`,
          style: selectedStyle,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Regen failed')
      const data = await res.json()
      updatePanel(id, { image_url: data.imageUrl })
    } catch (err: any) {
      console.error('Regen failed:', err)
      alert(`Regeneration failed: ${err.message}`)
    }
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-2 p-2 bg-ink rounded-card">
        <SortableContext 
          items={panels.map(p => p.id)}
          strategy={rectSortingStrategy}
        >
          {panels.map((panel, i) => {
            const isWide = i % 3 === 0
            return (
              <SortablePanel 
                key={panel.id} 
                panel={panel} 
                index={i} 
                editable={editable}
                isWide={isWide}
                onUpdate={handleUpdate}
                onRegenerate={handleRegenerate}
              />
            )
          })}
        </SortableContext>
      </div>
    </DndContext>
  )
}
