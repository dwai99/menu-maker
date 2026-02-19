import React, { useState, useRef, useEffect } from 'react'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'

export const PageTabBar: React.FC = () => {
  const { pageLayout, addPage, removePage, renamePage } = useLayoutStore()
  const { activePageId, setActivePageId, markDirty } = useUIStore()
  const pages = pageLayout.pages

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // Auto-select first page if none selected
  useEffect(() => {
    if (pages && pages.length > 0 && (!activePageId || !pages.find((p) => p.id === activePageId))) {
      setActivePageId(pages[0].id)
    }
  }, [pages, activePageId, setActivePageId])

  if (!pages || pages.length === 0) return null

  const handleAddPage = () => {
    const name = `Page ${pages.length + 1}`
    addPage(name)
    markDirty()
    // Select the new page after it's created
    setTimeout(() => {
      const updated = useLayoutStore.getState().pageLayout.pages
      if (updated && updated.length > 0) {
        setActivePageId(updated[updated.length - 1].id)
      }
    }, 0)
  }

  const handleDoubleClick = (pageId: string, currentName: string) => {
    setEditingId(pageId)
    setEditValue(currentName)
  }

  const handleRenameCommit = () => {
    if (editingId && editValue.trim()) {
      renamePage(editingId, editValue.trim())
      markDirty()
    }
    setEditingId(null)
  }

  const handleDelete = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    if (pages.length <= 1) return
    if (!confirm('Delete this page? Its sections will move to the first page.')) return
    removePage(pageId)
    markDirty()
    // Select first remaining page
    setTimeout(() => {
      const updated = useLayoutStore.getState().pageLayout.pages
      if (updated && updated.length > 0) {
        setActivePageId(updated[0].id)
      }
    }, 0)
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-neutral-100 border-b border-neutral-200 overflow-x-auto">
      {pages.map((page) => {
        const isActive = page.id === activePageId
        const isEditing = editingId === page.id

        return (
          <div
            key={page.id}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors shrink-0 ${
              isActive
                ? 'bg-white border border-amber-400 text-amber-800 font-medium shadow-sm'
                : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
            }`}
            onClick={() => setActivePageId(page.id)}
            onDoubleClick={() => handleDoubleClick(page.id, page.name)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameCommit()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="w-20 px-1 py-0 text-sm border border-amber-400 rounded bg-white focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{page.name}</span>
            )}
            {pages.length > 1 && !isEditing && (
              <button
                onClick={(e) => handleDelete(e, page.id)}
                className="ml-1 text-neutral-400 hover:text-red-500 text-xs font-bold transition-colors"
                title="Delete page"
              >
                x
              </button>
            )}
          </div>
        )
      })}
      <button
        onClick={handleAddPage}
        className="px-2 py-1.5 rounded-md text-sm text-neutral-500 hover:bg-neutral-200 transition-colors shrink-0"
        title="Add page"
      >
        +
      </button>
    </div>
  )
}
