import { useState, useCallback, useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import TemplateGallery from './components/editor/TemplateGallery'
import ShortcutsOverlay from './components/editor/ShortcutsOverlay'
import VersionHistoryPanel from './components/editor/VersionHistoryPanel'
import WelcomeWizard from './components/onboarding/WelcomeWizard'
import { useProjectManager } from './hooks/useProjectManager'
import { useDocumentTabs } from './hooks/useDocumentTabs'
import { useExportPdf } from './hooks/useExportPdf'
import { useImportPdf } from './hooks/useImportPdf'
import { useImportImage } from './hooks/useImportImage'
import { useUndoRedo } from './hooks/useUndoRedo'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useOverflowDetection } from './hooks/useOverflowDetection'
import { useMenuStore } from './stores/menu-store'
import { useLayoutStore } from './stores/layout-store'
import { useUIStore } from './stores/ui-store'
import { stylePresets } from './templates/style-presets'
import type { MenuTemplate } from './templates'
import type { WelcomeWizardResult } from './components/onboarding/WelcomeWizard'

export default function App() {
  const [showTemplates, setShowTemplates] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { loadMenuData, setTitle } = useMenuStore()
  const { loadPageLayout, pageLayout } = useLayoutStore()
  const { markDirty, setFilePath } = useUIStore()

  useProjectManager()
  useDocumentTabs()
  useExportPdf()
  useImportPdf()
  const { importImage } = useImportImage()
  useUndoRedo()
  useOverflowDetection()
  useKeyboardShortcuts()

  // Check if this is the first launch and show wizard if so
  useEffect(() => {
    window.electronAPI?.getSetting?.('hasLaunched')?.then((hasLaunched) => {
      if (!hasLaunched) {
        setShowWizard(true)
      }
    })
  }, [])

  // Listen for custom event from EmptyState "Browse Templates" button
  useEffect(() => {
    const handler = () => setShowTemplates(true)
    window.addEventListener('menu-maker:show-templates', handler)
    return () => window.removeEventListener('menu-maker:show-templates', handler)
  }, [])

  // Listen for custom event to relaunch the wizard
  useEffect(() => {
    const handler = () => setShowWizard(true)
    window.addEventListener('menu-maker:show-wizard', handler)
    return () => window.removeEventListener('menu-maker:show-wizard', handler)
  }, [])

  // Listen for custom event to toggle the shortcuts overlay
  useEffect(() => {
    const handler = () => setShowShortcuts((prev) => !prev)
    window.addEventListener('menu-maker:show-shortcuts', handler)
    return () => window.removeEventListener('menu-maker:show-shortcuts', handler)
  }, [])

  // Listen for custom event to show the version history panel
  useEffect(() => {
    const handler = () => setShowHistory(true)
    window.addEventListener('menu-maker:show-history', handler)
    return () => window.removeEventListener('menu-maker:show-history', handler)
  }, [])

  // Listen for custom event from EmptyState "Import from Photo" button
  useEffect(() => {
    const handler = () => {
      importImage().catch((err) => {
        console.error('Import from photo failed:', err)
      })
    }
    window.addEventListener('menu-maker:import-image', handler)
    return () => window.removeEventListener('menu-maker:import-image', handler)
  }, [importImage])

  const handleTemplateSelect = useCallback(
    (template: MenuTemplate) => {
      loadMenuData(template.menuData)
      loadPageLayout(template.pageLayout)
      setFilePath(null)
      markDirty()
      setShowTemplates(false)
    },
    [loadMenuData, loadPageLayout, setFilePath, markDirty]
  )

  const handleWizardComplete = useCallback(
    async (result: WelcomeWizardResult) => {
      // Apply restaurant name if provided
      if (result.restaurantName) {
        setTitle(result.restaurantName)
      }

      // Apply style preset if selected
      if (result.presetId) {
        const preset = stylePresets.find((p) => p.id === result.presetId)
        if (preset) {
          const currentLayout = useLayoutStore.getState().pageLayout
          loadPageLayout({
            ...currentLayout,
            colorScheme: preset.colorScheme,
            typography: preset.typography,
          })
        }
      }

      // Mark as launched so wizard doesn't auto-show again
      await window.electronAPI?.setSetting?.('hasLaunched', true)

      setShowWizard(false)
    },
    [setTitle, loadPageLayout]
  )

  // When the user picks "Import Existing Menu" from the wizard, open the file dialog
  const handleWizardImport = useCallback(async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.showOpenDialog()
    if (result.canceled || !result.filePaths?.length) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.fileOpen(filePath)
    if (fileResult.success && fileResult.data) {
      try {
        const { migrateProject } = await import('./models/project')
        const raw = JSON.parse(fileResult.data)
        const project = migrateProject(raw)
        loadMenuData(project.menuData)
        loadPageLayout(project.pageLayout)
        setFilePath(filePath)
        markDirty()
        try { await window.electronAPI.addRecentFile(filePath) } catch { /* non-critical */ }
      } catch {
        // If import fails, silently stay with the current state
      }
    }
    // Advance wizard to the name/style step regardless of import success
    // (the wizard component handles step advancement internally via onImportFile callback)
  }, [loadMenuData, loadPageLayout, setFilePath, markDirty])

  const handleWizardSkip = useCallback(async () => {
    // Mark as launched so wizard doesn't auto-show again
    await window.electronAPI?.setSetting?.('hasLaunched', true)
    setShowWizard(false)
  }, [])

  return (
    <>
      <AppShell
        onShowTemplates={() => setShowTemplates(true)}
        onShowHistory={() => setShowHistory(true)}
      />
      {showTemplates && (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}
      {showHistory && (
        <VersionHistoryPanel onClose={() => setShowHistory(false)} />
      )}
      {showWizard && (
        <WelcomeWizard
          onComplete={handleWizardComplete}
          onOpenTemplates={() => {
            setShowWizard(false)
            setShowTemplates(true)
          }}
          onImportFile={handleWizardImport}
          onSkip={handleWizardSkip}
        />
      )}
    </>
  )
}
