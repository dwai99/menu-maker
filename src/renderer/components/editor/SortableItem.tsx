import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MenuItem } from '@/models/menu'
import { ItemEditor } from './ItemEditor'

interface SortableItemProps {
  sectionId: string
  item: MenuItem
}

export const SortableItem: React.FC<SortableItemProps> = ({ sectionId, item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ItemEditor
        sectionId={sectionId}
        item={item}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
