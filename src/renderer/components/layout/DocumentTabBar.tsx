import React from 'react'
import { useUIStore } from '@/stores/ui-store'
import type { DocumentTab } from '@/stores/ui-store'

export default function DocumentTabBar(): React.ReactElement | null {
  const { documentTabs, activeDocumentId } = useUIStore()

  if (documentTabs.length <= 1) return null

  const handleTabClick = (tab: DocumentTab) => {
    // Dispatch event first so useDocumentTabs can snapshot/restore before the active ID changes
    window.dispatchEvent(new CustomEvent('menu-maker:switch-tab', { detail: { tabId: tab.id } }))
  }

  const handleCloseClick = (e: React.MouseEvent, tab: DocumentTab) => {
    e.stopPropagation()
    // Dispatch event first so useDocumentTabs can handle cleanup before the tab is removed
    window.dispatchEvent(new CustomEvent('menu-maker:close-tab', { detail: { tabId: tab.id } }))
  }

  return (
    <div className="flex items-center bg-neutral-100 border-b border-neutral-200 px-1 h-9 gap-0.5">
      {documentTabs.map((tab) => {
        const isActive = tab.id === activeDocumentId
        const label = tab.isDirty ? `${tab.name} *` : tab.name

        return (
          <div
            key={tab.id}
            className={[
              'flex items-center gap-1 px-3 py-1 rounded-t-md max-w-[180px] transition-colors',
              isActive
                ? 'bg-white border-b-2 border-amber-600'
                : 'hover:bg-neutral-50',
            ].join(' ')}
          >
            <button
              onClick={() => handleTabClick(tab)}
              title={tab.filePath ?? tab.name}
              role="tab"
              aria-selected={isActive}
              className={[
                'text-xs truncate transition-colors',
                isActive ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {label}
            </button>
            <button
              aria-label={`Close ${tab.name}`}
              onClick={(e) => handleCloseClick(e, tab)}
              className="w-5 h-5 flex items-center justify-center rounded shrink-0 text-neutral-400 hover:text-red-500 hover:bg-red-100 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
