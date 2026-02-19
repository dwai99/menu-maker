import React, { useState, useCallback, useEffect } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import { migrateProject } from '@/models/project'
import type { MenuProject } from '@/models/project'
import type { MenuSection } from '@/models/menu'

interface ImportMenuDialogProps {
  open: boolean
  onClose: () => void
}

export const ImportMenuDialog: React.FC<ImportMenuDialogProps> = ({ open, onClose }) => {
  const { appendSections } = useMenuStore()
  const { loadPageLayout, assignSectionToPage } = useLayoutStore()
  const { markDirty, activePageId } = useUIStore()

  const [project, setProject] = useState<MenuProject | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [includeLayout, setIncludeLayout] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(async () => {
    if (!window.electronAPI) { onClose(); return }
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.showOpenDialog()
      if (result.canceled || !result.filePaths?.length) {
        onClose()
        return
      }

      const filePath = result.filePaths[0]
      const fileResult = await window.electronAPI.fileOpen(filePath)
      if (!fileResult.success || !fileResult.data) {
        setError(fileResult.error || 'Failed to read file')
        return
      }

      const raw = JSON.parse(fileResult.data)
      const migrated = migrateProject(raw)
      setProject(migrated)
      // Select all sections by default
      setSelectedIds(new Set(migrated.menuData.sections.map((s) => s.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      setProject(null)
      setSelectedIds(new Set())
      setIncludeLayout(false)
      setError(null)
      loadFile()
    }
  }, [open, loadFile])

  const toggleSection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (!project) return
    const allIds = project.menuData.sections.map((s) => s.id)
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const handleImport = () => {
    if (!project) return

    const sectionsToImport = project.menuData.sections.filter((s) => selectedIds.has(s.id))
    if (sectionsToImport.length === 0) {
      onClose()
      return
    }

    appendSections(sectionsToImport)
    markDirty()

    // If multi-page mode, assign new sections to active page
    const pages = useLayoutStore.getState().pageLayout.pages
    if (pages && activePageId) {
      setTimeout(() => {
        const allSections = useMenuStore.getState().menuData.sections
        // The newly appended sections are at the end
        const newSections = allSections.slice(allSections.length - sectionsToImport.length)
        for (const s of newSections) {
          assignSectionToPage(s.id, activePageId)
        }
        useUIStore.getState().markDirty()
      }, 0)
    }

    if (includeLayout) {
      loadPageLayout(project.pageLayout)
      markDirty()
    }

    onClose()
  }

  if (!open) return null

  // Still loading or file dialog was dismissed
  if (loading || (!project && !error)) return null

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">Import Error</h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!project) return null

  const sections = project.menuData.sections
  const allSelected = selectedIds.size === sections.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-800">Import from .menu File</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Select sections to import from{' '}
            <span className="font-medium text-neutral-700">{project.menuData.title || 'Untitled'}</span>
          </p>
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto p-4">
          {sections.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">No sections found in this file.</p>
          ) : (
            <>
              {/* Select all */}
              <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 cursor-pointer mb-1 border-b border-neutral-100 pb-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-neutral-600">Select All</span>
              </label>

              {sections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-neutral-800 block truncate">
                      {section.title || 'Untitled Section'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </label>
              ))}
            </>
          )}
        </div>

        {/* Include layout toggle */}
        <div className="px-5 py-3 border-t border-neutral-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLayout}
              onChange={(e) => setIncludeLayout(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <span className="text-sm font-medium text-neutral-700">Include layout settings</span>
              <span className="text-xs text-neutral-400 block">
                Typography, colors, page size, margins, etc.
              </span>
            </div>
          </label>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
