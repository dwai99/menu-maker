import React, { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import { SectionEditor } from './SectionEditor'
import { EmptyState } from './EmptyState'
import { PageTabBar } from './PageTabBar'
import { ImportMenuDialog } from './ImportMenuDialog'

export const ContentTab: React.FC = () => {
  const { menuData, setTitle, setSubtitle, setFooter, addSection, reorderSections } = useMenuStore()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const { pageLayout, assignSectionToPage, reorderSectionInPage, enableMultiPageMode } = useLayoutStore()
  const { markDirty, activePageId } = useUIStore()

  const pages = pageLayout.pages
  const isMultiPage = !!pages && pages.length > 0

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
      </div>

      {/* Page Tab Bar (multi-page mode) */}
      {isMultiPage && <PageTabBar />}

      {/* Enable Pages button (legacy mode) */}
      {!isMultiPage && menuData.sections.length > 0 && (
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
        {visibleSections.length === 0 ? (
          isMultiPage ? (
            <div className="p-8 text-center text-neutral-400 text-sm">
              No sections on this page.
              <br />
              <button
                onClick={handleAddSection}
                className="mt-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                + Add Section
              </button>
            </div>
          ) : (
            <EmptyState
              onAddSection={handleAddSection}
              onShowTemplates={() => {
                window.dispatchEvent(new CustomEvent('menu-maker:show-templates'))
              }}
            />
          )
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              {visibleSections.map((section) => (
                <SectionEditor key={section.id} section={section} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Section / Import Buttons */}
      {visibleSections.length > 0 && (
        <div className="p-4 bg-white border-t border-neutral-200 flex gap-2">
          <button
            onClick={handleAddSection}
            className="flex-1 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            + Add Section
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Import...
          </button>
        </div>
      )}

      {/* Footer Field */}
      <div className="p-4 border-t border-neutral-300 bg-white">
        <label className="block text-xs font-medium text-neutral-500 mb-1">Footer Text</label>
        <input
          type="text"
          value={menuData.footer}
          onChange={handleFooterChange}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="e.g., Prices subject to change"
        />
      </div>

      <ImportMenuDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />
    </div>
  )
}
