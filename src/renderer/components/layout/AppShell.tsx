import { useRef, useCallback, useState, useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { ContentTab } from '@/components/editor/ContentTab'
import { StyleTab } from '@/components/editor/StyleTab'
import { PageTab } from '@/components/editor/PageTab'
import { LogoEditor } from '@/components/editor/LogoEditor'
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
  const { leftPanelWidth, setLeftPanelWidth, activeTab, setActiveTab, isLeftPanelCollapsed, viewMode, setViewMode, currentFilePath } = useUIStore()
  const { exportImage } = useExportImage()
  const isResizingRef = useRef(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

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
    { id: 'logo', label: 'Logo' },
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
        return <LogoEditor />
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Document Tab Bar — only visible when multiple files open */}
      <DocumentTabBar />

      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-200">
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

        <div className="flex items-center gap-1.5">
          <span className="border-l border-neutral-200 h-5 mr-1" />
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
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 min-w-[160px]">
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
    </div>
  )
}
