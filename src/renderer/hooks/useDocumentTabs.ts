import { useEffect, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import type { DocumentTab } from '@/stores/ui-store'
import type { MenuData } from '@/models/menu'
import type { PageLayout } from '@/models/layout'

/**
 * Snapshots the currently active document's store state into its tab record.
 * This is a pure helper that reads store state directly — no React hooks.
 */
function snapshotCurrentTab(): void {
  const {
    activeDocumentId,
    isDirty,
    currentFilePath,
    updateDocumentTab,
  } = useUIStore.getState()

  if (!activeDocumentId) return

  const { menuData } = useMenuStore.getState()
  const { pageLayout } = useLayoutStore.getState()

  updateDocumentTab(activeDocumentId, {
    snapshot: { menuData, pageLayout },
    isDirty,
    filePath: currentFilePath,
  })
}

/**
 * Clears undo/redo history for both temporal stores.
 */
function clearUndoHistory(): void {
  useMenuStore.temporal.getState().clear()
  useLayoutStore.temporal.getState().clear()
}

/**
 * Restores a tab's snapshot into the live stores and synchronises UI state.
 * Does NOT set the active document ID — callers handle that separately.
 */
function restoreTabSnapshot(tab: DocumentTab): void {
  const { loadMenuData } = useMenuStore.getState()
  const { loadPageLayout } = useLayoutStore.getState()
  const { setFilePath, markDirty, markClean, clearSelection } = useUIStore.getState()

  loadMenuData(tab.snapshot.menuData)
  loadPageLayout(tab.snapshot.pageLayout)
  setFilePath(tab.filePath)

  if (tab.isDirty) {
    markDirty()
  } else {
    markClean()
  }

  clearSelection()
  clearUndoHistory()
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseDocumentTabsReturn {
  switchToTab: (tabId: string) => void
  openNewTab: (
    name: string,
    filePath: string | null,
    menuData: MenuData,
    pageLayout: PageLayout
  ) => void
  closeTab: (tabId: string) => void
  hasMultipleTabs: boolean
}

export function useDocumentTabs(): UseDocumentTabsReturn {
  // Reactive read for hasMultipleTabs — keeps the value updated on every render.
  const hasMultipleTabs = useUIStore((s) => s.documentTabs.length > 1)

  // ------------------------------------------------------------------
  // switchToTab
  // ------------------------------------------------------------------
  const switchToTab = useCallback((tabId: string) => {
    const { activeDocumentId, documentTabs, setActiveDocument } =
      useUIStore.getState()

    // Do nothing if already on the requested tab.
    if (activeDocumentId === tabId) return

    // Persist the current tab's live state before leaving it.
    snapshotCurrentTab()

    // Find the target tab and restore its snapshot.
    const targetTab = documentTabs.find((t) => t.id === tabId)
    if (!targetTab) return

    restoreTabSnapshot(targetTab)
    setActiveDocument(tabId)
  }, [])

  // ------------------------------------------------------------------
  // openNewTab
  // ------------------------------------------------------------------
  const openNewTab = useCallback(
    (
      name: string,
      filePath: string | null,
      menuData: MenuData,
      pageLayout: PageLayout
    ) => {
      const { addDocumentTab } = useUIStore.getState()

      // Persist the current tab's live state before switching away.
      snapshotCurrentTab()

      const newTab: DocumentTab = {
        id: nanoid(),
        filePath,
        name,
        isDirty: false,
        snapshot: { menuData, pageLayout },
      }

      // addDocumentTab sets activeDocumentId to the new tab's id internally.
      addDocumentTab(newTab)

      // Restore the new tab's data into the live stores.
      restoreTabSnapshot(newTab)
    },
    []
  )

  // ------------------------------------------------------------------
  // closeTab
  // ------------------------------------------------------------------
  const closeTab = useCallback((tabId: string) => {
    const { documentTabs, activeDocumentId, removeDocumentTab } =
      useUIStore.getState()

    const tab = documentTabs.find((t) => t.id === tabId)
    if (!tab) return

    // Prompt the user before discarding unsaved changes.
    if (tab.isDirty) {
      const proceed = confirm('Unsaved changes. Close anyway?')
      if (!proceed) return
    }

    // If closing the currently active tab, switch to an adjacent tab first so
    // the live stores are loaded with valid data before the tab disappears.
    if (activeDocumentId === tabId) {
      const currentIndex = documentTabs.findIndex((t) => t.id === tabId)
      const adjacentTab =
        documentTabs[currentIndex + 1] ?? documentTabs[currentIndex - 1]

      if (adjacentTab) {
        // Snapshot the tab being closed so its data is preserved in its record
        // momentarily (not strictly necessary since we are removing it, but
        // keeps snapshotCurrentTab() consistent with the "always snapshot
        // before leaving" contract).
        snapshotCurrentTab()

        // Restore the adjacent tab without using switchToTab, because
        // switchToTab would attempt to snapshot the current (closing) tab
        // a second time and then call setActiveDocument — we handle the
        // removal ourselves via removeDocumentTab below.
        restoreTabSnapshot(adjacentTab)
        useUIStore.getState().setActiveDocument(adjacentTab.id)
      }
    }

    removeDocumentTab(tabId)
  }, [])

  // ------------------------------------------------------------------
  // Custom event listeners
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent<{ tabId: string }>) => {
      switchToTab(event.detail.tabId)
    }

    const handleCloseTab = (event: CustomEvent<{ tabId: string }>) => {
      closeTab(event.detail.tabId)
    }

    window.addEventListener(
      'menu-maker:switch-tab',
      handleSwitchTab as EventListener
    )
    window.addEventListener(
      'menu-maker:close-tab',
      handleCloseTab as EventListener
    )

    return () => {
      window.removeEventListener(
        'menu-maker:switch-tab',
        handleSwitchTab as EventListener
      )
      window.removeEventListener(
        'menu-maker:close-tab',
        handleCloseTab as EventListener
      )
    }
  }, [switchToTab, closeTab])

  return { switchToTab, openNewTab, closeTab, hasMultipleTabs }
}
