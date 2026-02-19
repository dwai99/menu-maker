import { useEffect, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import type { DocumentTab } from '@/stores/ui-store'
import type { MenuProject } from '@/models/project'
import { migrateProject } from '@/models/project'

/** Extract a display name from a file path */
function fileDisplayName(filePath: string | null): string {
  if (!filePath) return 'Untitled'
  const name = filePath.split('/').pop()?.split('\\').pop() ?? 'Untitled'
  return name.replace(/\.menu$/, '')
}

export function useProjectManager() {
  const menuStore = useMenuStore()
  const layoutStore = useLayoutStore()
  const uiStore = useUIStore()
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initRef = useRef(false)

  const serializeProject = useCallback((): string => {
    const project: MenuProject = {
      version: 3,
      menuData: menuStore.menuData,
      pageLayout: layoutStore.pageLayout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return JSON.stringify(project, null, 2)
  }, [menuStore.menuData, layoutStore.pageLayout])

  /** Snapshot the current tab's state into its document tab record */
  const snapshotCurrentTab = useCallback(() => {
    const { activeDocumentId, updateDocumentTab, isDirty, currentFilePath } = useUIStore.getState()
    if (!activeDocumentId) return
    const { menuData } = useMenuStore.getState()
    const { pageLayout } = useLayoutStore.getState()
    updateDocumentTab(activeDocumentId, {
      snapshot: { menuData, pageLayout },
      isDirty,
      filePath: currentFilePath,
      name: fileDisplayName(currentFilePath),
    })
  }, [])

  /** Helper to open a file into a new tab (or replace current blank tab) */
  const openFileInTab = useCallback((filePath: string, projectJson: string) => {
    const raw = JSON.parse(projectJson)
    const project = migrateProject(raw)
    const name = fileDisplayName(filePath)
    const { documentTabs, activeDocumentId, addDocumentTab, updateDocumentTab } = useUIStore.getState()

    // If current tab is untitled and clean, replace it instead of adding a new tab
    const currentTab = documentTabs.find((t) => t.id === activeDocumentId)
    if (currentTab && !currentTab.isDirty && !currentTab.filePath) {
      menuStore.loadMenuData(project.menuData)
      layoutStore.loadPageLayout(project.pageLayout)
      uiStore.setFilePath(filePath)
      uiStore.markClean()
      uiStore.clearSelection()
      updateDocumentTab(currentTab.id, {
        name,
        filePath,
        isDirty: false,
        snapshot: { menuData: project.menuData, pageLayout: project.pageLayout },
      })
    } else {
      // Snapshot current tab before switching
      snapshotCurrentTab()

      // Create new tab
      const newTab: DocumentTab = {
        id: nanoid(),
        filePath,
        name,
        isDirty: false,
        snapshot: { menuData: project.menuData, pageLayout: project.pageLayout },
      }
      addDocumentTab(newTab)

      // Load into live stores
      menuStore.loadMenuData(project.menuData)
      layoutStore.loadPageLayout(project.pageLayout)
      uiStore.setFilePath(filePath)
      uiStore.markClean()
      uiStore.clearSelection()
    }
  }, [menuStore, layoutStore, uiStore, snapshotCurrentTab])

  const handleSave = useCallback(async () => {
    if (!window.electronAPI) return
    let filePath = uiStore.currentFilePath

    if (!filePath) {
      const result = await window.electronAPI.showSaveDialog()
      if (result.canceled || !result.filePath) return
      filePath = result.filePath
      uiStore.setFilePath(filePath)
    }

    const json = serializeProject()
    const result = await window.electronAPI.fileSave(filePath, json)
    if (result.success) {
      uiStore.markClean()
      // Update tab name/path
      const { activeDocumentId, updateDocumentTab } = useUIStore.getState()
      if (activeDocumentId) {
        updateDocumentTab(activeDocumentId, {
          name: fileDisplayName(filePath),
          filePath,
          isDirty: false,
        })
      }
      try { await window.electronAPI.addRecentFile(filePath) } catch { /* non-critical */ }
      try {
        await window.electronAPI.createSnapshot({ projectFilePath: filePath, projectJson: json, summary: 'Save' })
      } catch { /* non-critical */ }
    } else {
      alert(`Failed to save: ${result.error}`)
    }
  }, [uiStore, serializeProject])

  const handleSaveAs = useCallback(async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.showSaveDialog()
    if (result.canceled || !result.filePath) return

    uiStore.setFilePath(result.filePath)
    const json = serializeProject()
    const saveResult = await window.electronAPI.fileSave(result.filePath, json)
    if (saveResult.success) {
      uiStore.markClean()
      const { activeDocumentId, updateDocumentTab } = useUIStore.getState()
      if (activeDocumentId) {
        updateDocumentTab(activeDocumentId, {
          name: fileDisplayName(result.filePath),
          filePath: result.filePath,
          isDirty: false,
        })
      }
      try { await window.electronAPI.addRecentFile(result.filePath) } catch { /* non-critical */ }
      try {
        await window.electronAPI.createSnapshot({ projectFilePath: result.filePath, projectJson: json, summary: 'Save As' })
      } catch { /* non-critical */ }
    } else {
      alert(`Failed to save: ${saveResult.error}`)
    }
  }, [uiStore, serializeProject])

  const handleOpen = useCallback(async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.showOpenDialog()
    if (result.canceled || !result.filePaths?.length) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.fileOpen(filePath)
    if (fileResult.success && fileResult.data) {
      openFileInTab(filePath, fileResult.data)
      try { await window.electronAPI.addRecentFile(filePath) } catch { /* non-critical */ }
    } else {
      alert(`Failed to open: ${fileResult.error}`)
    }
  }, [openFileInTab])

  /** Open a specific file by path (from recent files or Open Recent menu) */
  const handleOpenRecent = useCallback(async (filePath: string) => {
    if (!window.electronAPI) return
    const fileResult = await window.electronAPI.fileOpen(filePath)
    if (fileResult.success && fileResult.data) {
      openFileInTab(filePath, fileResult.data)
      try { await window.electronAPI.addRecentFile(filePath) } catch { /* non-critical */ }
    } else {
      alert(`Failed to open: ${fileResult.error}`)
    }
  }, [openFileInTab])

  /** Import menu data (content only) from an existing .menu file */
  const handleImportData = useCallback(async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.showOpenDialog()
    if (result.canceled || !result.filePaths?.length) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.fileOpen(filePath)
    if (fileResult.success && fileResult.data) {
      try {
        const raw = JSON.parse(fileResult.data)
        const project = migrateProject(raw)
        // Only load menu content, NOT layout
        menuStore.loadMenuData(project.menuData)
        uiStore.markDirty()
      } catch {
        alert('Failed to parse menu file for import')
      }
    } else {
      alert(`Failed to open: ${fileResult.error}`)
    }
  }, [menuStore, uiStore])

  const handleNew = useCallback(() => {
    // Snapshot current tab before switching
    snapshotCurrentTab()

    // Reset stores to defaults
    menuStore.reset()
    layoutStore.reset()
    uiStore.setFilePath(null)
    uiStore.markClean()
    uiStore.clearSelection()

    // Create new tab with fresh data
    const { menuData } = useMenuStore.getState()
    const { pageLayout } = useLayoutStore.getState()
    const { addDocumentTab } = useUIStore.getState()
    const newTab: DocumentTab = {
      id: nanoid(),
      filePath: null,
      name: 'Untitled',
      isDirty: false,
      snapshot: { menuData, pageLayout },
    }
    addDocumentTab(newTab)
  }, [menuStore, layoutStore, uiStore, snapshotCurrentTab])

  // Update window title when file path or dirty state changes
  useEffect(() => {
    const name = fileDisplayName(uiStore.currentFilePath)
    const dirty = uiStore.isDirty ? ' *' : ''
    const title = `${name}${dirty} \u2014 Menu Maker`
    window.electronAPI?.setWindowTitle?.(title)
  }, [uiStore.isDirty, uiStore.currentFilePath])

  // Auto-save when dirty (configurable interval)
  const autoSaveInterval = useUIStore((s) => s.autoSaveInterval)
  useEffect(() => {
    if (uiStore.isDirty && uiStore.currentFilePath) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(async () => {
        if (!window.electronAPI) return
        const json = serializeProject()
        await window.electronAPI.fileSave(uiStore.currentFilePath + '.autosave', json)
      }, autoSaveInterval * 1000)
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [uiStore.isDirty, uiStore.currentFilePath, serializeProject, autoSaveInterval])

  // Initialize first tab + restore last file on launch (runs once)
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const { addDocumentTab } = useUIStore.getState()
    const { menuData } = useMenuStore.getState()
    const { pageLayout } = useLayoutStore.getState()

    // Create initial tab for the blank document
    const initialTab: DocumentTab = {
      id: nanoid(),
      filePath: null,
      name: 'Untitled',
      isDirty: false,
      snapshot: { menuData, pageLayout },
    }
    addDocumentTab(initialTab)

    // Load auto-save interval setting
    window.electronAPI?.getSetting?.('autoSaveInterval')?.then((val) => {
      if (typeof val === 'number' && val >= 10) {
        useUIStore.getState().setAutoSaveInterval(val)
      }
    })

    // Try to restore last file
    window.electronAPI?.getRecentFiles?.()?.then(async (recentFiles) => {
      if (recentFiles.length === 0) return
      try {
        const filePath = recentFiles[0]
        if (!window.electronAPI) return
        const fileResult = await window.electronAPI.fileOpen(filePath)
        if (fileResult.success && fileResult.data) {
          openFileInTab(filePath, fileResult.data)
        }
      } catch { /* silently skip if file doesn't exist */ }
    })
  }, [openFileInTab])

  // Register menu command listeners
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanups = [
      window.electronAPI.onMenuNew(handleNew),
      window.electronAPI.onMenuOpen(handleOpen),
      window.electronAPI.onMenuSave(handleSave),
      window.electronAPI.onMenuSaveAs(handleSaveAs),
      window.electronAPI.onMenuOpenRecent((filePath: string) => handleOpenRecent(filePath)),
      window.electronAPI.onMenuImportData(handleImportData),
    ]
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [handleNew, handleOpen, handleSave, handleSaveAs, handleOpenRecent, handleImportData])

  // Listen for custom event from EmptyState recent files
  useEffect(() => {
    const handler = (e: Event) => {
      const filePath = (e as CustomEvent).detail?.filePath
      if (filePath) handleOpenRecent(filePath)
    }
    window.addEventListener('menu-maker:open-recent', handler)
    return () => window.removeEventListener('menu-maker:open-recent', handler)
  }, [handleOpenRecent])

  // Keep active tab dirty state in sync
  useEffect(() => {
    const { activeDocumentId, updateDocumentTab } = useUIStore.getState()
    if (activeDocumentId) {
      updateDocumentTab(activeDocumentId, { isDirty: uiStore.isDirty })
    }
  }, [uiStore.isDirty])

  return { handleSave, handleSaveAs, handleOpen, handleNew, handleOpenRecent, handleImportData, serializeProject }
}
