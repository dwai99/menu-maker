import { useRef, useCallback, useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { useUIStore } from '@/stores/ui-store'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import type { LayoutView } from '@/models/project'
import { ContentTab } from '@/components/editor/ContentTab'
import { StyleTab } from '@/components/editor/StyleTab'
import { PageTab } from '@/components/editor/PageTab'
import { ImagesTab } from '@/components/editor/ImagesTab'
import { PagePreview } from '@/components/preview/PagePreview'
import { useExportImage } from '@/hooks/useExportImage'
import { PAGE_SIZES } from '@/models/layout'
import DocumentTabBar from './DocumentTabBar'

/**
 * Floating toast displayed in the bottom-right corner while OCR is running.
 * Reads progress state directly from ui-store and auto-dismisses 1.2s after
 * completion (the hook already clears `active` after that delay).
 */
function OCRProgressToast() {
  const ocrProgress = useUIStore((state) => state.ocrProgress)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (ocrProgress.active) {
      setVisible(true)
    } else {
      // Keep the element mounted for a moment to allow the fade-out to play
      const timer = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(timer)
    }
  }, [ocrProgress.active])

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg p-4 transition-opacity duration-300 ${ocrProgress.active ? 'opacity-100' : 'opacity-0'}`}
    >
      <p className="text-xs font-semibold text-neutral-700 mb-2">
        Importing from photo...
      </p>
      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${ocrProgress.progress}%` }}
        />
      </div>
      <p className="text-xs text-neutral-500">{ocrProgress.message}</p>
    </div>
  )
}

/** Standalone PDF export — does NOT register a menu listener (App.tsx handles that) */
async function doExportPdf() {
  if (!window.electronAPI) return
  const { pageLayout } = useLayoutStore.getState()
  const pageSize = PAGE_SIZES[pageLayout.pageSize]
  if (!pageSize) { alert('Invalid page size selected'); return }

  let pageWidth = pageSize.width
  let pageHeight = pageSize.height
  if (pageLayout.orientation === 'landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth]
  }

  const styleEl = document.createElement('style')
  styleEl.id = 'pdf-export-styles'
  styleEl.textContent = `@media print { .print-page { page-break-after: always; break-after: page; } .print-page:last-child { page-break-after: avoid; break-after: avoid; } }`
  document.head.appendChild(styleEl)

  try {
    const result = await window.electronAPI.exportPdf({ pageWidth, pageHeight })
    styleEl.remove()
    if (result.success && result.filePath) {
      alert(`PDF exported to ${result.filePath}`)
    } else if (result.error !== 'Canceled') {
      alert(`Failed to export PDF: ${result.error || 'Unknown error'}`)
    }
  } catch (error) {
    styleEl.remove()
    alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

type TabType = 'content' | 'style' | 'page' | 'logo'

interface AppShellProps {
  onShowTemplates?: () => void
  onShowHistory?: () => void
}

export default function AppShell({ onShowTemplates, onShowHistory }: AppShellProps) {
  const { leftPanelWidth, setLeftPanelWidth, activeTab, setActiveTab, isLeftPanelCollapsed, viewMode, setViewMode, currentFilePath, zoom, layoutViews, activeLayoutViewId, setLayoutViews, setActiveLayoutViewId, switchLayoutView } = useUIStore()
  const { exportImage, exportAllPages } = useExportImage()
  const isResizingRef = useRef(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

  // Close export dropdown when clicking outside
  useEffect(() => {
    if (!showExportMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const showLeftPanel = viewMode !== 'preview' && !isLeftPanelCollapsed
  const showRightPanel = viewMode !== 'editor'

  const handleSaveAsTemplate = useCallback(async () => {
    const name = prompt('Template name:')
    if (!name) return
    try {
      const menuData = useMenuStore.getState().menuData
      const pageLayout = useLayoutStore.getState().pageLayout
      const projectJson = JSON.stringify({ menuData, pageLayout })
      const result = await window.electronAPI?.saveCustomTemplate(name, projectJson)
      if (result?.success) {
        alert(`Template "${name}" saved!`)
      }
    } catch (error) {
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return

      const newWidth = moveEvent.clientX
      const clampedWidth = Math.min(Math.max(newWidth, 300), 800)
      setLeftPanelWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'content', label: 'Content' },
    { id: 'style', label: 'Style' },
    { id: 'page', label: 'Page' },
    { id: 'logo', label: 'Elements' },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'content':
        return <ContentTab />
      case 'style':
        return <StyleTab />
      case 'page':
        return <PageTab />
      case 'logo':
        return <ImagesTab />
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Document Tab Bar — only visible when multiple files open */}
      <DocumentTabBar />

      {/* Top Action Bar */}
      <div className="relative z-[101] flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          {onShowTemplates && (
            <button
              onClick={onShowTemplates}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
            >
              Templates
            </button>
          )}
          <button
            onClick={handleSaveAsTemplate}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
            title="Save current design as a custom template"
          >
            Save as Template
          </button>
          {currentFilePath && onShowHistory && (
            <button
              onClick={onShowHistory}
              className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
              title="View version history"
            >
              History
            </button>
          )}
          <span className="border-l border-neutral-200 h-5 mx-1" />
        </div>

        {/* View Mode Toggle — always visible */}
        <div className="flex items-center bg-neutral-200 rounded-md p-0.5 gap-px">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'editor' ? 'bg-white text-amber-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'}`}
            title="Editor only (Cmd+1)"
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'split' ? 'bg-white text-amber-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'}`}
            title="Split view (Cmd+2)"
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'preview' ? 'bg-white text-amber-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'}`}
            title="Preview only (Cmd+3)"
          >
            Preview
          </button>
        </div>

        {/* Layout View Switcher — always visible */}
        <div className="flex items-center gap-1">
          {layoutViews.length > 0 ? (
            <>
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mr-0.5">View:</span>
              <div className="flex items-center bg-neutral-200 rounded-md p-0.5 gap-px">
                {layoutViews.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      switchLayoutView(view.id)
                      useUIStore.getState().markDirty()
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      view.id === activeLayoutViewId
                        ? 'bg-white text-amber-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {view.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const currentLayout = useLayoutStore.getState().pageLayout
                  const name = `View ${layoutViews.length + 1}`
                  const newView: LayoutView = { id: nanoid(), name, pageLayout: JSON.parse(JSON.stringify(currentLayout)) }
                  const updated = layoutViews.map(v =>
                    v.id === activeLayoutViewId ? { ...v, pageLayout: currentLayout } : v
                  )
                  setLayoutViews([...updated, newView])
                  useUIStore.getState().markDirty()
                }}
                className="px-1.5 py-1 text-xs font-medium text-neutral-400 hover:text-amber-700 rounded transition-colors"
                title="Add another layout view"
              >
                +
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const currentLayout = useLayoutStore.getState().pageLayout
                const first: LayoutView = { id: nanoid(), name: 'Main Menu', pageLayout: JSON.parse(JSON.stringify(currentLayout)) }
                const second: LayoutView = { id: nanoid(), name: 'Tri-Fold', pageLayout: JSON.parse(JSON.stringify(currentLayout)) }
                setLayoutViews([first, second])
                setActiveLayoutViewId(first.id)
                useUIStore.getState().markDirty()
              }}
              className="px-3 py-1 text-xs font-medium text-neutral-500 bg-white border border-neutral-200 rounded-md hover:border-amber-400 hover:text-amber-700 transition-colors"
              title="Create layout views to share content across different formats (e.g., Main Menu + Tri-Fold)"
            >
              + Add Layout View
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center bg-neutral-100 rounded-lg">
            <button
              onClick={() => useUIStore.getState().zoomOut()}
              className="px-2 py-1 text-sm font-bold text-neutral-600 hover:bg-neutral-200 rounded-l-lg transition-colors"
              aria-label="Zoom out"
            >
              -
            </button>
            <span className="text-xs font-medium min-w-[40px] text-center text-neutral-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => useUIStore.getState().zoomIn()}
              className="px-2 py-1 text-sm font-bold text-neutral-600 hover:bg-neutral-200 rounded-r-lg transition-colors"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <button
            onClick={() => useUIStore.getState().resetZoom()}
            className="px-2 py-1 text-xs font-medium text-neutral-500 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
          >
            Reset
          </button>
          <span className="border-l border-neutral-200 h-5 mx-0.5" />
          <button
            onClick={() => exportImage({ format: 'png' })}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={() => doExportPdf()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 border border-amber-700 rounded-md hover:bg-amber-700 transition-colors"
          >
            Export PDF
          </button>
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-2.5 py-1.5 text-xs font-medium text-neutral-500 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
            >
              More ▾
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-[200] min-w-[160px]">
                <button
                  onClick={() => { exportImage({ format: 'png', scale: 4 }); setShowExportMenu(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  PNG — Print (4x)
                </button>
                <button
                  onClick={() => { exportImage({ format: 'jpeg', quality: 0.92 }); setShowExportMenu(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  JPEG (High)
                </button>
                <button
                  onClick={() => { exportImage({ format: 'jpeg', quality: 0.7 }); setShowExportMenu(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  JPEG (Compact)
                </button>
                <div className="border-t border-neutral-100 my-1" />
                <button
                  onClick={() => { exportAllPages({ format: 'png' }); setShowExportMenu(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  All Pages (PNG)
                </button>
                <button
                  onClick={() => { exportAllPages({ format: 'jpeg', quality: 0.92 }); setShowExportMenu(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  All Pages (JPEG)
                </button>
                <div className="border-t border-neutral-100 my-1" />
                {currentFilePath && onShowHistory && (
                  <button
                    onClick={() => {
                      onShowHistory()
                      setShowExportMenu(false)
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Version History...
                  </button>
                )}
                <button
                  onClick={() => { window.dispatchEvent(new CustomEvent('menu-maker:show-wizard')); setShowExportMenu(false) }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Getting Started...
                </button>
                <div className="border-t border-neutral-100 my-1" />
                <button
                  onClick={() => {
                    setShowExportMenu(false)
                    setShowPreferencesModal(true)
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Preferences...
                </button>
                <button
                  onClick={async () => {
                    setShowExportMenu(false)
                    const current = await window.electronAPI?.getSetting?.('anthropicApiKey') || ''
                    setApiKeyValue(current)
                    setShowApiKeyModal(true)
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  AI Settings...
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-row min-h-0">
        {/* Left Panel */}
        {showLeftPanel && (
          <div
            className="flex flex-col bg-white"
            style={{ width: viewMode === 'editor' ? '100%' : `${leftPanelWidth}px` }}
          >
            {/* Tab Bar */}
            <div className="flex border-b border-neutral-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'content' | 'style' | 'page' | 'logo')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'text-amber-700 border-b-[3px] border-amber-700'
                    : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
              <div className="flex-1" />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {renderTabContent()}
            </div>
          </div>
        )}

        {/* Resize Handle (split mode only) */}
        {viewMode === 'split' && showLeftPanel && (
          <div
            className="w-1 cursor-col-resize bg-neutral-300 hover:bg-amber-700 transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Right Panel */}
        {showRightPanel && (
          <div className="flex-1 overflow-hidden relative">
            <PagePreview />
          </div>
        )}
      </div>

      {/* OCR progress toast — fixed bottom-right, reads from ui-store */}
      <OCRProgressToast />

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <PreferencesModal onClose={() => setShowPreferencesModal(false)} />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[440px] p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-1">AI Settings</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Enter your Anthropic API key to enable AI-powered menu import from photos.
              Get a key at{' '}
              <span className="font-medium text-amber-700">console.anthropic.com</span>
            </p>
            <label className="block text-sm font-medium text-neutral-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  window.electronAPI?.setSetting?.('anthropicApiKey', apiKeyValue.trim())
                  setShowApiKeyModal(false)
                }
              }}
            />
            <p className="text-xs text-neutral-400 mb-4">
              Leave blank to use basic offline OCR. Your key is stored locally and never shared.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.electronAPI?.setSetting?.('anthropicApiKey', apiKeyValue.trim())
                  setShowApiKeyModal(false)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-amber-700 rounded-lg hover:bg-amber-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreferencesModal({ onClose }: { onClose: () => void }) {
  const {
    showItemBadges, setShowItemBadges,
    showDietaryIcons, setShowDietaryIcons,
    showFeaturedItem, setShowFeaturedItem,
    showPriceVariants, setShowPriceVariants,
    showCustomLayout, setShowCustomLayout,
    autoSaveInterval, setAutoSaveInterval,
    defaultCurrency, setDefaultCurrency,
    defaultZoom, setDefaultZoom,
    previewLayout, setPreviewLayout,
  } = useUIStore()

  const toggles: Array<{ key: string; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = [
    { key: 'dietary', label: 'Dietary Icons', desc: 'V, VG, GF, DF, Nuts, Spicy toggles on items', checked: showDietaryIcons, onChange: setShowDietaryIcons },
    { key: 'badges', label: 'Item Badges', desc: 'New, Popular, Chef\'s Pick, Seasonal badges on items', checked: showItemBadges, onChange: setShowItemBadges },
    { key: 'featured', label: 'Featured Item', desc: 'Highlight checkbox to feature individual items', checked: showFeaturedItem, onChange: setShowFeaturedItem },
    { key: 'variants', label: 'Price Variants', desc: 'Size variants (Small/Large) with separate prices', checked: showPriceVariants, onChange: setShowPriceVariants },
    { key: 'custom', label: 'Custom Layout', desc: 'Free-form rich text editing for individual items', checked: showCustomLayout, onChange: setShowCustomLayout },
  ]

  const currencies = [
    { value: '$', label: '$ Dollar' },
    { value: '€', label: '€ Euro' },
    { value: '£', label: '£ Pound' },
    { value: '¥', label: '¥ Yen' },
    { value: 'none', label: 'None' },
  ]

  const zoomOptions = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-5">Preferences</h3>

        {/* Item Editor Features */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Item Editor Features</h4>
          <div className="space-y-2.5">
            {toggles.map((t) => (
              <label key={t.key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.checked}
                  onChange={(e) => t.onChange(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-neutral-700">{t.label}</span>
                  <p className="text-xs text-neutral-400">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mb-5 pt-4 border-t border-neutral-200">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Preview</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-700">Default Zoom</span>
                <p className="text-xs text-neutral-400">Initial zoom level for the preview</p>
              </div>
              <select
                value={defaultZoom}
                onChange={(e) => setDefaultZoom(Number(e.target.value))}
                className="px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {zoomOptions.map((z) => (
                  <option key={z} value={z}>{Math.round(z * 100)}%</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-700">Multi-Page Layout</span>
                <p className="text-xs text-neutral-400">How multiple pages are displayed</p>
              </div>
              <select
                value={previewLayout}
                onChange={(e) => setPreviewLayout(e.target.value as 'stacked' | 'side-by-side')}
                className="px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="side-by-side">Side by Side</option>
                <option value="stacked">Stacked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Defaults */}
        <div className="mb-5 pt-4 border-t border-neutral-200">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Defaults</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-700">Currency</span>
                <p className="text-xs text-neutral-400">Default currency symbol for new menus</p>
              </div>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {currencies.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-700">Auto-Save Interval</span>
                <p className="text-xs text-neutral-400">How often to auto-save (seconds)</p>
              </div>
              <input
                type="number"
                min={10}
                max={600}
                step={10}
                value={autoSaveInterval}
                onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-amber-700 rounded-lg hover:bg-amber-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
