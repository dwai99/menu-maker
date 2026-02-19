import { useEffect, useCallback } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'

export function useUndoRedo() {
  const menuTemporal = useMenuStore.temporal
  const layoutTemporal = useLayoutStore.temporal

  const undo = useCallback(() => {
    menuTemporal.getState().undo()
    layoutTemporal.getState().undo()
  }, [menuTemporal, layoutTemporal])

  const redo = useCallback(() => {
    menuTemporal.getState().redo()
    layoutTemporal.getState().redo()
  }, [menuTemporal, layoutTemporal])

  useEffect(() => {
    if (!window.electronAPI) return
    const cleanups = [
      window.electronAPI.onMenuUndo(undo),
      window.electronAPI.onMenuRedo(redo),
    ]
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [undo, redo])

  return { undo, redo }
}
