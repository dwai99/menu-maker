import { useEffect } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'

/**
 * Global keyboard shortcuts for the app.
 * Ctrl/Cmd+D = duplicate selected section
 * Delete/Backspace = delete selected section (when not in input)
 * Escape = clear selection
 * Ctrl/Cmd+1 = editor-only view
 * Ctrl/Cmd+2 = split view
 * Ctrl/Cmd+3 = preview-only view
 * Ctrl/Cmd+Shift+I = import from photo
 * Ctrl/Cmd+/ or Ctrl/Cmd+? = toggle shortcuts help overlay
 * Ctrl/Cmd+Shift+H = show version history
 */
export function useKeyboardShortcuts() {
  const {
    selectedSectionId,
    selectedItemId,
    clearSelection,
  } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Escape — clear selection
      if (e.key === 'Escape') {
        clearSelection()
        return
      }

      const mod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+1/2/3 — view mode switching (works even in inputs)
      if (mod && e.key === '1') {
        e.preventDefault()
        useUIStore.getState().setViewMode('editor')
        return
      }
      if (mod && e.key === '2') {
        e.preventDefault()
        useUIStore.getState().setViewMode('split')
        return
      }
      if (mod && e.key === '3') {
        e.preventDefault()
        useUIStore.getState().setViewMode('preview')
        return
      }

      // Cmd/Ctrl+Shift+I — import from photo (works even in inputs)
      if (mod && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('menu-maker:import-image'))
        return
      }

      // Cmd/Ctrl+/ or Cmd/Ctrl+? — toggle shortcuts help overlay (works even in inputs)
      if (mod && (e.key === '/' || e.key === '?')) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('menu-maker:show-shortcuts'))
        return
      }

      // Cmd/Ctrl+Shift+H — show version history (works even in inputs)
      if (mod && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('menu-maker:show-history'))
        return
      }

      // Don't intercept when typing in form fields
      if (isInput) return

      // Cmd/Ctrl+D — duplicate selected section
      if (mod && e.key === 'd' && selectedSectionId) {
        e.preventDefault()
        const menuStore = useMenuStore.getState()
        if (selectedItemId) {
          menuStore.duplicateItem(selectedSectionId, selectedItemId)
        } else {
          menuStore.duplicateSection(selectedSectionId)
        }
        useUIStore.getState().markDirty()
        return
      }

      // Delete/Backspace — delete selected section
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSectionId && !selectedItemId) {
        e.preventDefault()
        useMenuStore.getState().removeSection(selectedSectionId)
        clearSelection()
        useUIStore.getState().markDirty()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedSectionId, selectedItemId, clearSelection])
}
