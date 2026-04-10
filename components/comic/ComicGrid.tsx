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
    }t 
  }

  const handleUpdate = (id: string, updates: Partial<Panel>) => {
    updatePanel(id, updates)
  }

  const handleRegenerate = async (id: string) => {
    // Implement API call for single panel regeneration
    console.log("Regenerating panel", id)
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
