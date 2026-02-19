import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import type { MenuSection } from '@/models/menu'
import { ColorInput } from './ColorInput'
import { SortableItem } from './SortableItem'

interface SectionEditorProps {
  section: MenuSection
}

// ── Emoji Picker ──────────────────────────────────────────────────

const FOOD_EMOJIS = [
  '🍕', '🍔', '🌮', '🍣', '🥗', '🍝', '🥩', '🍗',
  '🦐', '🍳', '🥞', '☕', '🍷', '🍺', '🍸', '🧁',
  '🍰', '🍩', '🥐', '🥖', '🧀', '🥑', '🌯', '🍜',
  '🥡', '🍲', '🥘', '🫕', '🧆', '🥙', '🌶️', '🍱',
]

const EmojiPicker: React.FC<{ value: string; onChange: (emoji: string) => void }> = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-10 h-10 flex items-center justify-center border border-neutral-300 rounded-lg text-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
          title="Choose section icon"
        >
          {value || <span className="text-neutral-300 text-sm">+</span>}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
          <div className="absolute top-12 left-0 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 w-64">
            <div className="grid grid-cols-8 gap-1">
              {FOOD_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { onChange(emoji); setShowPicker(false); }}
                  className={`w-7 h-7 flex items-center justify-center rounded text-base hover:bg-amber-50 transition-colors ${
                    value === emoji ? 'bg-amber-100 ring-1 ring-amber-400' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Section Editor ────────────────────────────────────────────────

export const SectionEditor: React.FC<SectionEditorProps> = ({ section }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const { updateSection, removeSection, addItem, reorderItems, duplicateSection, updateSectionColor, updateSectionIcon } = useMenuStore()
  const { pageLayout, assignSectionToPage, removeSectionFromPages } = useLayoutStore()
  const { selectedSectionId, selectSection, markDirty } = useUIStore()

  const pages = pageLayout.pages
  const isMultiPage = !!pages && pages.length > 1

  const isSelected = selectedSectionId === section.id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = section.items.findIndex((i) => i.id === active.id)
      const newIndex = section.items.findIndex((i) => i.id === over.id)
      reorderItems(section.id, oldIndex, newIndex)
      markDirty()
    }
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    selectSection(section.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this section and all its items?')) {
      removeSection(section.id)
      removeSectionFromPages(section.id)
      markDirty()
    }
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateSection(section.id)
    markDirty()
    // Assign duplicate to same page
    if (pages) {
      const currentPage = pages.find((p) => p.sectionIds.includes(section.id))
      if (currentPage) {
        setTimeout(() => {
          const sections = useMenuStore.getState().menuData.sections
          // The duplicate is right after the original
          const idx = sections.findIndex((s) => s.id === section.id)
          if (idx !== -1 && idx + 1 < sections.length) {
            assignSectionToPage(sections[idx + 1].id, currentPage.id)
            useUIStore.getState().markDirty()
          }
        }, 0)
      }
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSection(section.id, { title: e.target.value })
    markDirty()
  }

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSection(section.id, { subtitle: e.target.value })
    markDirty()
  }

  const handleFootnoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSection(section.id, { footnote: e.target.value })
    markDirty()
  }

  const handleAddItem = () => {
    addItem(section.id)
    markDirty()
  }

  const itemIds = section.items.map((i) => i.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-neutral-200 rounded-lg m-3 overflow-hidden ${
        isSelected ? 'border-l-4 border-l-amber-600' : ''
      }`}
    >
      {/* Section Header */}
      <div
        onClick={handleToggle}
        className="flex items-center justify-between px-4 py-3 bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          {/* Drag Handle */}
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 select-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder section"
            role="button"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
            </svg>
          </span>
          <span className="text-neutral-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
          <h3 className="text-sm font-medium text-neutral-900">
            {section.title || 'Untitled Section'}
          </h3>
          <span className="text-xs text-neutral-400">
            ({section.items.length} {section.items.length === 1 ? 'item' : 'items'})
          </span>
        </div>
        {isMultiPage && pages && (
          <select
            value={pages.find((p) => p.sectionIds.includes(section.id))?.id ?? ''}
            onChange={(e) => {
              e.stopPropagation()
              assignSectionToPage(section.id, e.target.value)
              markDirty()
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-neutral-300 rounded px-1 py-0.5 bg-white text-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            title="Move to page"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={handleDuplicate}
          className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-amber-600 hover:bg-neutral-100 text-sm font-medium transition-colors"
          title="Duplicate section"
        >
          ⧉
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 text-sm font-bold transition-colors"
          title="Delete section"
        >
          ✕
        </button>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Section Title</label>
            <input
              type="text"
              value={section.title}
              onChange={handleTitleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="e.g., Appetizers, Main Courses"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Section Icon</label>
            <EmojiPicker
              value={section.icon || ''}
              onChange={(emoji) => { updateSectionIcon(section.id, emoji); markDirty(); }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Section Subtitle (optional)
            </label>
            <input
              type="text"
              value={section.subtitle}
              onChange={handleSubtitleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="e.g., All day favorites"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Section Footnote (optional)
            </label>
            <input
              type="text"
              value={section.footnote}
              onChange={handleFootnoteChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="e.g., * Contains nuts"
            />
          </div>

          {/* Per-section Color Overrides */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-xs font-medium text-neutral-500">Section Colors (optional)</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <ColorInput
                  label="Accent"
                  value={section.colorOverride?.accent || pageLayout.colorScheme.accent}
                  onChange={(color) => {
                    updateSectionColor(section.id, {
                      ...section.colorOverride,
                      accent: color,
                    })
                    markDirty()
                  }}
                />
              </div>
              <div className="flex-1">
                <ColorInput
                  label="Background"
                  value={section.colorOverride?.background || pageLayout.colorScheme.background}
                  onChange={(color) => {
                    updateSectionColor(section.id, {
                      ...section.colorOverride,
                      background: color,
                    })
                    markDirty()
                  }}
                />
              </div>
            </div>
            {section.colorOverride && (
              <button
                type="button"
                onClick={() => { updateSectionColor(section.id, undefined); markDirty(); }}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Reset to default colors
              </button>
            )}
          </div>

          {/* Sortable Items List */}
          {section.items.length > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleItemDragEnd}
              >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  {section.items.map((item) => (
                    <SortableItem key={item.id} sectionId={section.id} item={item} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          <button
            onClick={handleAddItem}
            className="w-full px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            + Add Item
          </button>
        </div>
      )}
    </div>
  )
}
