import React, { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import { TRI_FOLD_FRONT_PANELS, TRI_FOLD_BACK_PANELS } from '@/models/layout'
import type { TriFoldPanelRole } from '@/models/layout'
import { SectionEditor } from './SectionEditor'
import { EmptyState } from './EmptyState'
import { PageTabBar } from './PageTabBar'
import { ImportMenuDialog } from './ImportMenuDialog'
import { CsvImportDialog } from './CsvImportDialog'

const PageDropZone: React.FC<{
  pageId: string
  pageName: string
  children: React.ReactNode
  isEmpty: boolean
}> = ({ pageId, pageName, children, isEmpty }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `page-drop-${pageId}` })
  return (
    <div
      ref={setNodeRef}
      className={`border-b border-neutral-200 ${isOver ? 'bg-amber-50' : ''}`}
    >
      <div className="px-4 py-2 bg-neutral-100 border-b border-neutral-200">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{pageName}</span>
      </div>
      <div className="min-h-[40px]">
        {children}
        {isEmpty && (
          <div className="px-4 py-3 text-xs text-neutral-400 text-center italic">
            Drop sections here
          </div>
        )}
      </div>
    </div>
  )
}

export const ContentTab: React.FC = () => {
  const { menuData, setTitle, setSubtitle, setFooter, addSection, reorderSections } = useMenuStore()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCsvDialog, setShowCsvDialog] = useState(false)
  const { pageLayout, assignSectionToPage, reorderSectionInPage, enableMultiPageMode } = useLayoutStore()
  const { markDirty, activePageId, selectedSectionId, selectedItemId } = useUIStore()

  // Scroll the content tab to the selected section or item
  useEffect(() => {
    const targetId = selectedItemId || selectedSectionId
    if (!targetId) return
    const timer = setTimeout(() => {
      const attr = selectedItemId ? 'data-item-id' : 'data-section-id'
      const el = document.querySelector(`[${attr}="${targetId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedSectionId, selectedItemId])

  const pages = pageLayout.pages
  const isMultiPage = !!pages && pages.length > 0
  const isTriFold = !!pageLayout.triFold?.enabled

  // Get the active page definition
  const activePage = useMemo(() => {
    if (!pages || !activePageId) return null
    return pages.find((p) => p.id === activePageId) ?? pages[0] ?? null
  }, [pages, activePageId])

  // Filter sections to show: in multi-page mode, only sections assigned to active page
  const visibleSections = useMemo(() => {
    if (!isMultiPage || !activePage) return menuData.sections
    const idSet = new Set(activePage.sectionIds)
    // Preserve the order from sectionIds
    return activePage.sectionIds
      .map((id) => menuData.sections.find((s) => s.id === id))
      .filter((s): s is typeof menuData.sections[number] => s != null)
  }, [isMultiPage, activePage, menuData.sections])

  // All pages with their sections (for cross-page drag mode)
  const allPageSections = useMemo(() => {
    if (!pages) return []
    return pages.map(page => ({
      page,
      sections: page.sectionIds
        .map(id => menuData.sections.find(s => s.id === id))
        .filter((s): s is typeof menuData.sections[number] => s != null),
    }))
  }, [pages, menuData.sections])

  // Tri-fold: group sections by side (Front / Back) from panelSections
  const triFoldPageGroups = useMemo(() => {
    if (!isTriFold) return null
    const panelSections = pageLayout.triFold?.panelSections ?? {}
    const sectionMap = new Map(menuData.sections.map((s) => [s.id, s]))

    const collectSections = (panels: TriFoldPanelRole[]) => {
      const seen = new Set<string>()
      const result: typeof menuData.sections = []
      for (const panel of panels) {
        for (const id of panelSections[panel] ?? []) {
          if (!seen.has(id)) {
            seen.add(id)
            const s = sectionMap.get(id)
            if (s) result.push(s)
          }
        }
      }
      return result
    }

    return [
      { name: 'Front Side', id: 'front', sections: collectSections(TRI_FOLD_FRONT_PANELS) },
      { name: 'Back Side (Inside)', id: 'back', sections: collectSections(TRI_FOLD_BACK_PANELS) },
    ]
  }, [isTriFold, pageLayout.triFold?.panelSections, menuData.sections])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      if (isMultiPage && activePage) {
        // Reorder within the page's sectionIds
        const oldIndex = activePage.sectionIds.indexOf(active.id as string)
        const newIndex = activePage.sectionIds.indexOf(over.id as string)
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderSectionInPage(activePage.id, oldIndex, newIndex)
          markDirty()
        }
      } else {
        const oldIndex = menuData.sections.findIndex((s) => s.id === active.id)
        const newIndex = menuData.sections.findIndex((s) => s.id === over.id)
        reorderSections(oldIndex, newIndex)
        markDirty()
      }
    }
  }

  const handleDragEndMultiPage = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !pages) return

    const draggedSectionId = active.id as string

    // Check if dropped on a page drop zone
    const overId = over.id as string
    if (overId.startsWith('page-drop-')) {
      const targetPageId = overId.replace('page-drop-', '')
      // Find which page currently owns this section
      const currentPage = pages.find(p => p.sectionIds.includes(draggedSectionId))
      if (currentPage && currentPage.id !== targetPageId) {
        assignSectionToPage(draggedSectionId, targetPageId)
        markDirty()
      }
      return
    }

    // Dropped on another section — check if same page or different page
    const overSectionId = overId
    const sourcePage = pages.find(p => p.sectionIds.includes(draggedSectionId))
    const targetPage = pages.find(p => p.sectionIds.includes(overSectionId))

    if (!sourcePage || !targetPage) return

    if (sourcePage.id === targetPage.id) {
      // Same page — reorder
      const oldIndex = sourcePage.sectionIds.indexOf(draggedSectionId)
      const newIndex = sourcePage.sectionIds.indexOf(overSectionId)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderSectionInPage(sourcePage.id, oldIndex, newIndex)
        markDirty()
      }
    } else {
      // Different page — move section to target page
      assignSectionToPage(draggedSectionId, targetPage.id)
      markDirty()
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    markDirty()
  }

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubtitle(e.target.value)
    markDirty()
  }

  const handleFooterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFooter(e.target.value)
    markDirty()
  }

  const handleAddSection = () => {
    addSection()
    markDirty()
    // If multi-page, assign new section to active page
    if (isMultiPage && activePage) {
      // Get the newly created section (last one)
      setTimeout(() => {
        const sections = useMenuStore.getState().menuData.sections
        const newSection = sections[sections.length - 1]
        if (newSection) {
          assignSectionToPage(newSection.id, activePage.id)
          useUIStore.getState().markDirty()
        }
      }, 0)
    }
  }

  const handleEnablePages = () => {
    // When enabling, ensure all sections are captured even if no explicit layouts exist
    const allSectionIds = menuData.sections.map((s) => s.id)
    enableMultiPageMode()
    // If enableMultiPageMode created page with only layout section IDs, patch it
    const state = useLayoutStore.getState()
    if (state.pageLayout.pages && state.pageLayout.pages.length === 1) {
      const page = state.pageLayout.pages[0]
      const missing = allSectionIds.filter((id) => !page.sectionIds.includes(id))
      if (missing.length > 0) {
        for (const id of missing) {
          assignSectionToPage(id, page.id)
        }
      }
    }
    markDirty()
    // Select the first page
    setTimeout(() => {
      const updated = useLayoutStore.getState().pageLayout.pages
      if (updated && updated.length > 0) {
        useUIStore.getState().setActivePageId(updated[0].id)
      }
    }, 0)
  }

  const sectionIds = visibleSections.map((s) => s.id)

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-neutral-50">
      {/* Menu Header Fields */}
      <div className="p-4 border-b border-neutral-200 bg-white">
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Menu Title</label>
          <input
            type="text"
            value={menuData.title}
            onChange={handleTitleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Menu Title"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Menu Subtitle</label>
          <input
            type="text"
            value={menuData.subtitle}
            onChange={handleSubtitleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Menu Subtitle (optional)"
          />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Footer Text</label>
          <input
            type="text"
            value={menuData.footer}
            onChange={handleFooterChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g., Prices subject to change (leave empty to hide)"
          />
        </div>
      </div>

      {/* Page Tab Bar (multi-page mode) */}
      {isMultiPage && <PageTabBar />}

      {/* Enable Pages button (non-tri-fold, non-multi-page) */}
      {!isMultiPage && !isTriFold && menuData.sections.length > 0 && (
        <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200">
          <button
            onClick={handleEnablePages}
            className="w-full px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Enable Pages (Front/Back)
          </button>
        </div>
      )}

      {/* Sortable Sections List */}
      <div className="flex-1">
        {isTriFold && triFoldPageGroups ? (
          /* Tri-fold: show sections grouped by Front Side / Back Side */
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {triFoldPageGroups.map((group) => (
              <div key={group.id} className="border-b border-neutral-200">
                <div className="px-4 py-2 bg-neutral-100 border-b border-neutral-200">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{group.name}</span>
                </div>
                <div className="min-h-[40px]">
                  {group.sections.length > 0 ? (
                    <SortableContext items={group.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {group.sections.map((section) => (
                        <SectionEditor key={section.id} section={section} />
                      ))}
                    </SortableContext>
                  ) : (
                    <div className="px-4 py-3 text-xs text-neutral-400 text-center italic">
                      No sections assigned
                    </div>
                  )}
                </div>
              </div>
            ))}
          </DndContext>
        ) : isMultiPage ? (
          /* Multi-page cross-drag view */
          allPageSections.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndMultiPage}>
              {allPageSections.map(({ page, sections: pageSections }) => (
                <PageDropZone
                  key={page.id}
                  pageId={page.id}
                  pageName={page.name || `Page ${pages!.indexOf(page) + 1}`}
                  isEmpty={pageSections.length === 0}
                >
                  <SortableContext items={pageSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {pageSections.map((section) => (
                      <SectionEditor key={section.id} section={section} />
                    ))}
                  </SortableContext>
                </PageDropZone>
              ))}
            </DndContext>
          ) : null
        ) : (
          /* Single-page view */
          visibleSections.length === 0 ? (
            <EmptyState
              onAddSection={handleAddSection}
              onShowTemplates={() => {
                window.dispatchEvent(new CustomEvent('menu-maker:show-templates'))
              }}
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                {visibleSections.map((section) => (
                  <SectionEditor key={section.id} section={section} />
                ))}
              </SortableContext>
            </DndContext>
          )
        )}
      </div>

      {/* Add Section / Import Buttons */}
      {(isTriFold ? menuData.sections.length > 0 : isMultiPage ? allPageSections.length > 0 : visibleSections.length > 0) && (
        <div className="p-4 bg-white border-t border-neutral-200 flex gap-2">
          <button
            onClick={handleAddSection}
            className="flex-1 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            + Add Section
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('menu-maker:duplicate-menu'))}
            className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            title="Create a copy of this menu in a new tab"
          >
            Duplicate
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Import...
          </button>
          <button
            onClick={() => setShowCsvDialog(true)}
            className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            CSV...
          </button>
        </div>
      )}

      <ImportMenuDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />
      <CsvImportDialog open={showCsvDialog} onClose={() => setShowCsvDialog(false)} />
    </div>
  )
}
