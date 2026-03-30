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
    // Save current layout back into the active view before serializing
    useUIStore.getState().syncActiveViewLayout()
    const { layoutViews } = useUIStore.getState()
    const currentMenuData = useMenuStore.getState().menuData
    const currentLayout = useLayoutStore.getState().pageLayout

    const project: MenuProject = {
      version: 3,
      menuData: currentMenuData,
      pageLayout: currentLayout,
      ...(layoutViews.length > 0 ? { layoutViews } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return JSON.stringify(project, null, 2)
  }, [menuStore.menuData, layoutStore.pageLayout])

  /** Snapshot the current tab's state into its document tab record */
  const snapshotCurrentTab = useCallback(() => {
    const { activeDocumentId, updateDocumentTab, isDirty, currentFilePath, layoutViews, activeLayoutViewId } = useUIStore.getState()
    if (!activeDocumentId) return
    const { menuData } = useMenuStore.getState()
    const { pageLayout } = useLayoutStore.getState()
    // Save current layout back into the active view
    let views = layoutViews
    if (activeLayoutViewId && layoutViews.length > 0) {
      views = layoutViews.map(v =>
        v.id === activeLayoutViewId ? { ...v, pageLayout } : v
      )
    }
    updateDocumentTab(activeDocumentId, {
      snapshot: { menuData, pageLayout, layoutViews: views, activeLayoutViewId },
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
    const { documentTabs, activeDocumentId, addDocumentTab, updateDocumentTab, setLayoutViews, setActiveLayoutViewId } = useUIStore.getState()

    // Load layout views from the project
    const views = project.layoutViews ?? []
    const activeViewId = views.length > 0 ? views[0].id : null
    const effectiveLayout = activeViewId ? views[0].pageLayout : project.pageLayout

    // If current tab is untitled and clean, replace it instead of adding a new tab
    const currentTab = documentTabs.find((t) => t.id === activeDocumentId)
    if (currentTab && !currentTab.isDirty && !currentTab.filePath) {
      menuStore.loadMenuData(project.menuData)
      layoutStore.loadPageLayout(effectiveLayout)
      setLayoutViews(views)
      setActiveLayoutViewId(activeViewId)
      uiStore.setFilePath(filePath)
      uiStore.markClean()
      uiStore.clearSelection()
      updateDocumentTab(currentTab.id, {
        name,
        filePath,
        isDirty: false,
        snapshot: { menuData: project.menuData, pageLayout: effectiveLayout, layoutViews: views, activeLayoutViewId: activeViewId },
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
        snapshot: { menuData: project.menuData, pageLayout: effectiveLayout, layoutViews: views, activeLayoutViewId: activeViewId },
      }
      addDocumentTab(newTab)
      setLayoutViews(views)
      setActiveLayoutViewId(activeViewId)

      // Load into live stores
      menuStore.loadMenuData(project.menuData)
      layoutStore.loadPageLayout(effectiveLayout)
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
      // Snapshot current menu data as the new "last saved" baseline for What Changed
      useUIStore.getState().setLastSavedMenuData(
        JSON.parse(JSON.stringify(useMenuStore.getState().menuData))
      )
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
      console.error('Failed to save:', result.error)
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
      // Snapshot current menu data as the new "last saved" baseline for What Changed
      useUIStore.getState().setLastSavedMenuData(
        JSON.parse(JSON.stringify(useMenuStore.getState().menuData))
      )
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
      console.error('Failed to save:', saveResult.error)
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
      console.error('Failed to open:', fileResult.error)
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
      console.error('Failed to open:', fileResult.error)
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
        console.error('Failed to parse menu file for import')
      }
    } else {
      console.error('Failed to open:', fileResult.error)
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
    useUIStore.getState().setLayoutViews([])
    useUIStore.getState().setActiveLayoutViewId(null)

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

  const handleDuplicate = useCallback(() => {
    // Snapshot current tab before switching
    snapshotCurrentTab()

    // Deep-clone menu data with new IDs
    const currentMenu = useMenuStore.getState().menuData
    const currentLayout = useLayoutStore.getState().pageLayout

    // Build mappings of old IDs to new ones for layout fixup
    const sectionIdMap = new Map<string, string>()
    const itemIdMap = new Map<string, string>()

    const clonedSections = currentMenu.sections.map((s) => {
      const newSectionId = nanoid()
      sectionIdMap.set(s.id, newSectionId)
      return {
        ...s,
        id: newSectionId,
        items: s.items.map((item) => {
          const newItemId = nanoid()
          itemIdMap.set(item.id, newItemId)
          return {
            ...item,
            id: newItemId,
            variants: item.variants?.map((v) => ({ ...v, id: nanoid() })),
          }
        }),
      }
    })

    const clonedMenuData = {
      ...currentMenu,
      title: currentMenu.title ? `${currentMenu.title} (Copy)` : 'Untitled (Copy)',
      sections: clonedSections,
      pageImages: currentMenu.pageImages?.map((img) => ({ ...img, id: nanoid() })),
      textFrames: currentMenu.textFrames?.map((tf) => ({ ...tf, id: nanoid(), style: { ...tf.style } })),
    }

    // Clone layout, remapping section IDs in sectionLayouts and pages
    const clonedLayout = {
      ...currentLayout,
      sectionLayouts: currentLayout.sectionLayouts.map((sl) => ({
        ...sl,
        sectionId: sectionIdMap.get(sl.sectionId) || sl.sectionId,
      })),
      pages: currentLayout.pages?.map((p) => ({
        ...p,
        id: nanoid(),
        sectionIds: p.sectionIds.map((id) => sectionIdMap.get(id) || id),
      })),
      triFold: currentLayout.triFold ? {
        ...currentLayout.triFold,
        panelSections: Object.fromEntries(
          Object.entries(currentLayout.triFold.panelSections).map(([panel, ids]) => [
            panel,
            (ids || []).map((id: string) => sectionIdMap.get(id) || id),
          ])
        ),
      } : undefined,
      typography: { ...currentLayout.typography },
      colorScheme: { ...currentLayout.colorScheme },
      margins: { ...currentLayout.margins },
    }

    // Clone layout views with remapped section/item IDs
    const { layoutViews, activeLayoutViewId } = useUIStore.getState()
    const remapLayout = (pl: any) => ({
      ...pl,
      sectionLayouts: (pl.sectionLayouts || []).map((sl: any) => ({
        ...sl,
        sectionId: sectionIdMap.get(sl.sectionId) || sl.sectionId,
      })),
      pages: pl.pages?.map((p: any) => ({
        ...p,
        id: nanoid(),
        sectionIds: (p.sectionIds || []).map((id: string) => sectionIdMap.get(id) || id),
      })),
      triFold: pl.triFold ? {
        ...pl.triFold,
        panelSections: Object.fromEntries(
          Object.entries(pl.triFold.panelSections).map(([panel, ids]) => [
            panel,
            ((ids as string[]) || []).map((id: string) => sectionIdMap.get(id) || id),
          ])
        ),
      } : undefined,
    })
    const clonedViews = layoutViews.map(v => ({
      ...v,
      id: nanoid(),
      pageLayout: remapLayout(JSON.parse(JSON.stringify(v.pageLayout))),
      hiddenSectionIds: (v.hiddenSectionIds || []).map(id => sectionIdMap.get(id) || id),
      hiddenItemIds: (v.hiddenItemIds || []).map(id => itemIdMap.get(id) || id),
    }))
    const clonedActiveViewId = clonedViews.length > 0 ? clonedViews[0].id : null

    // Load cloned data into stores
    menuStore.loadMenuData(clonedMenuData)
    layoutStore.loadPageLayout(clonedLayout)
    uiStore.setFilePath(null)
    uiStore.markDirty()
    uiStore.clearSelection()
    useUIStore.getState().setLayoutViews(clonedViews)
    useUIStore.getState().setActiveLayoutViewId(clonedActiveViewId)

    // Create new tab
    const { addDocumentTab } = useUIStore.getState()
    const newTab: DocumentTab = {
      id: nanoid(),
      filePath: null,
      name: clonedMenuData.title || 'Untitled (Copy)',
      isDirty: true,
      snapshot: { menuData: clonedMenuData, pageLayout: clonedLayout, layoutViews: clonedViews, activeLayoutViewId: clonedActiveViewId },
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
        const currentPath = useUIStore.getState().currentFilePath
        if (!currentPath) return
        const json = serializeProject()
        await window.electronAPI.fileSave(currentPath + '.autosave', json)
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

  // Listen for duplicate menu event
  useEffect(() => {
    const handler = () => handleDuplicate()
    window.addEventListener('menu-maker:duplicate-menu', handler)
    return () => window.removeEventListener('menu-maker:duplicate-menu', handler)
  }, [handleDuplicate])

  // Keep active tab dirty state in sync
  useEffect(() => {
    const { activeDocumentId, updateDocumentTab } = useUIStore.getState()
    if (activeDocumentId) {
      updateDocumentTab(activeDocumentId, { isDirty: uiStore.isDirty })
    }
  }, [uiStore.isDirty])

  return { handleSave, handleSaveAs, handleOpen, handleNew, handleDuplicate, handleOpenRecent, handleImportData, serializeProject }
}
