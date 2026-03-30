import { create } from 'zustand'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import {
  PageLayout,
  SectionLayout,
  ColorScheme,
  TypographyConfig,
  FontStyle,
  PageSizeId,
  Orientation,
  Margins,
  ItemSeparator,
  PriceFormat,
  createDefaultPageLayout,
} from '../models/layout'
import type { ColumnCount, LayoutDirection, SectionDecoration, Currency, BackgroundTexture, SectionDivider, PageBorder, Vertex, PageDefinition, VariantDisplayMode, VariantSeparator, SectionTitleDecoration, TriFoldConfig, TriFoldPaperSize, TriFoldPanelRole, TriFoldType, PrintMarks, HeaderConfig, PricePosition } from '../models/layout'
import { createDefaultHeaderConfig } from '../models/layout'
import { parseFragmentId } from '../layout/layout-engine'

interface LayoutStore {
  pageLayout: PageLayout

  setPageSize: (size: PageSizeId) => void
  setOrientation: (orientation: Orientation) => void
  setMargins: (margins: Margins) => void
  setColorScheme: (scheme: Partial<ColorScheme>) => void
  setTypography: (role: keyof TypographyConfig, style: Partial<FontStyle>) => void
  setColumnCount: (count: ColumnCount) => void
  setLayoutDirection: (dir: LayoutDirection) => void
  setItemSeparator: (sep: ItemSeparator) => void
  setPriceFormat: (format: PriceFormat) => void
  setPricePosition: (position: PricePosition) => void
  setSectionDecoration: (dec: SectionDecoration) => void
  setCurrency: (currency: Currency) => void
  setBackgroundTexture: (texture: BackgroundTexture) => void
  setSectionDivider: (divider: SectionDivider) => void
  setPageBorder: (border: PageBorder) => void
  setSectionGap: (gap: number) => void
  setVariantDisplayMode: (mode: VariantDisplayMode) => void
  setVariantSeparator: (sep: VariantSeparator) => void
  setHeaderHeight: (height: number) => void
  setSectionDecorations: (decs: SectionDecoration[]) => void
  setSectionTitleDecoration: (dec: SectionTitleDecoration) => void

  // Section layout
  setSectionLayout: (sectionId: string, layout: Partial<SectionLayout>) => void
  removeSectionLayout: (sectionId: string) => void
  setSectionLayouts: (layouts: SectionLayout[]) => void
  clearAllSectionLayouts: () => void

  // Fragment-aware section layout (matches on sectionId + startItemIndex)
  setFragmentLayout: (fragmentId: string, layout: Partial<SectionLayout>) => void
  removeFragmentLayout: (fragmentId: string) => void

  // Polygon vertex editing
  setPolygonVertex: (sectionId: string, vertexIndex: number, position: Vertex) => void
  addPolygonVertex: (sectionId: string, afterIndex: number, position: Vertex) => void
  removePolygonVertex: (sectionId: string, vertexIndex: number) => void

  // Multi-page management
  addPage: (name: string) => void
  removePage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
  setPageColumnCount: (pageId: string, count: ColumnCount) => void
  assignSectionToPage: (sectionId: string, pageId: string) => void
  reorderSectionInPage: (pageId: string, fromIndex: number, toIndex: number) => void
  removeSectionFromPages: (sectionId: string) => void
  enableMultiPageMode: () => void
  disableMultiPageMode: () => void

  // Print marks
  setPrintMarks: (marks: Partial<PrintMarks>) => void

  // Dietary legend
  setShowDietaryLegend: (show: boolean) => void

  // Tri-fold
  enableTriFold: (paperSize?: TriFoldPaperSize) => void
  disableTriFold: () => void
  setTriFoldPaperSize: (paperSize: TriFoldPaperSize) => void
  setTriFoldPanelSections: (panel: TriFoldPanelRole, sectionIds: string[]) => void
  setTriFoldType: (type: TriFoldType) => void
  updateTriFoldConfig: (updates: Partial<TriFoldConfig>) => void

  // Header config
  setHeaderConfig: (config: Partial<HeaderConfig>) => void

  // Batch update (single undo step)
  applyBatchUpdate: (updates: Partial<PageLayout>) => void

  // Bulk
  loadPageLayout: (layout: PageLayout) => void
  reset: () => void
}

export const useLayoutStore = create<LayoutStore>()(temporal((set) => ({
  pageLayout: createDefaultPageLayout(),

  setPageSize: (size: PageSizeId) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, pageSize: size },
    }))
  },

  setOrientation: (orientation: Orientation) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, orientation },
    }))
  },

  setMargins: (margins: Margins) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, margins },
    }))
  },

  setColorScheme: (scheme: Partial<ColorScheme>) => {
    set((state) => {
      const oldScheme = state.pageLayout.colorScheme
      const newScheme = { ...oldScheme, ...scheme }

      // Cascade color scheme changes into typography colors so the preview
      // reflects the new palette. Any typography role whose current color
      // matches the OLD scheme value gets updated to the NEW value.
      let typography = state.pageLayout.typography
      const colorMap: Array<{ oldColor: string; newColor: string }> = []

      if (scheme.text && scheme.text !== oldScheme.text) {
        colorMap.push({ oldColor: oldScheme.text, newColor: scheme.text })
      }
      if (scheme.accent && scheme.accent !== oldScheme.accent) {
        colorMap.push({ oldColor: oldScheme.accent, newColor: scheme.accent })
      }

      if (colorMap.length > 0) {
        const updated = { ...typography }
        for (const role of Object.keys(updated) as (keyof TypographyConfig)[]) {
          const fontStyle = updated[role]
          for (const { oldColor, newColor } of colorMap) {
            if (fontStyle.color.toLowerCase() === oldColor.toLowerCase()) {
              updated[role] = { ...fontStyle, color: newColor }
              break
            }
          }
        }
        typography = updated
      }

      return {
        pageLayout: {
          ...state.pageLayout,
          colorScheme: newScheme,
          typography,
        },
      }
    })
  },

  setTypography: (role: keyof TypographyConfig, style: Partial<FontStyle>) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        typography: {
          ...state.pageLayout.typography,
          [role]: { ...state.pageLayout.typography[role], ...style },
        },
      },
    }))
  },

  setColumnCount: (count: ColumnCount) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, columnCount: count },
    }))
  },

  setLayoutDirection: (dir: LayoutDirection) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, layoutDirection: dir },
    }))
  },

  setItemSeparator: (sep: ItemSeparator) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, itemSeparator: sep },
    }))
  },

  setPriceFormat: (format: PriceFormat) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, priceFormat: format },
    }))
  },

  setPricePosition: (position: PricePosition) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, pricePosition: position },
    }))
  },

  setSectionDecoration: (dec: SectionDecoration) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, sectionDecoration: dec },
    }))
  },

  setCurrency: (currency: Currency) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, currency },
    }))
  },

  setBackgroundTexture: (texture: BackgroundTexture) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, backgroundTexture: texture },
    }))
  },

  setSectionDivider: (divider: SectionDivider) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, sectionDivider: divider },
    }))
  },

  setSectionTitleDecoration: (dec: SectionTitleDecoration) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, sectionTitleDecoration: dec },
    }))
  },

  setPageBorder: (border: PageBorder) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, pageBorder: border },
    }))
  },

  setSectionGap: (gap: number) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, sectionGap: gap },
    }))
  },

  setVariantDisplayMode: (mode: VariantDisplayMode) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, variantDisplayMode: mode },
    }))
  },

  setVariantSeparator: (sep: VariantSeparator) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, variantSeparator: sep },
    }))
  },

  setHeaderHeight: (height: number) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, headerHeight: height },
    }))
  },

  setSectionDecorations: (decs: SectionDecoration[]) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, sectionDecorations: decs },
    }))
  },

  setSectionLayout: (sectionId: string, layout: Partial<SectionLayout>) => {
    set((state) => {
      const existing = state.pageLayout.sectionLayouts.find((sl) => sl.sectionId === sectionId)
      if (existing) {
        return {
          pageLayout: {
            ...state.pageLayout,
            sectionLayouts: state.pageLayout.sectionLayouts.map((sl) =>
              sl.sectionId === sectionId ? { ...sl, ...layout } : sl
            ),
          },
        }
      }
      // Create new section layout with polygon defaults
      const newLayout: SectionLayout = {
        sectionId,
        polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
        columnCount: 1,
        pageIndex: 0,
        ...layout,
      }
      return {
        pageLayout: {
          ...state.pageLayout,
          sectionLayouts: [...state.pageLayout.sectionLayouts, newLayout],
        },
      }
    })
  },

  removeSectionLayout: (sectionId: string) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: state.pageLayout.sectionLayouts.filter(
          (sl) => sl.sectionId !== sectionId
        ),
      },
    }))
  },

  setSectionLayouts: (layouts: SectionLayout[]) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: layouts,
      },
    }))
  },

  clearAllSectionLayouts: () => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: [],
      },
    }))
  },

  setFragmentLayout: (fragmentId: string, layout: Partial<SectionLayout>) => {
    const { sectionId, startItemIndex } = parseFragmentId(fragmentId)
    set((state) => {
      const existing = state.pageLayout.sectionLayouts.find(
        (sl) => sl.sectionId === sectionId && (sl.startItemIndex ?? 0) === startItemIndex
      )
      if (existing) {
        return {
          pageLayout: {
            ...state.pageLayout,
            sectionLayouts: state.pageLayout.sectionLayouts.map((sl) =>
              sl.sectionId === sectionId && (sl.startItemIndex ?? 0) === startItemIndex
                ? { ...sl, ...layout }
                : sl
            ),
          },
        }
      }
      // Create new fragment layout
      const newLayout: SectionLayout = {
        sectionId,
        polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
        columnCount: 1,
        pageIndex: 0,
        startItemIndex: startItemIndex > 0 ? startItemIndex : undefined,
        ...layout,
      }
      return {
        pageLayout: {
          ...state.pageLayout,
          sectionLayouts: [...state.pageLayout.sectionLayouts, newLayout],
        },
      }
    })
  },

  removeFragmentLayout: (fragmentId: string) => {
    const { sectionId, startItemIndex } = parseFragmentId(fragmentId)
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: state.pageLayout.sectionLayouts.filter(
          (sl) => !(sl.sectionId === sectionId && (sl.startItemIndex ?? 0) === startItemIndex)
        ),
      },
    }))
  },

  setPolygonVertex: (sectionId: string, vertexIndex: number, position: Vertex) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: state.pageLayout.sectionLayouts.map((sl) => {
          if (sl.sectionId !== sectionId) return sl
          const newPolygon = [...sl.polygon]
          newPolygon[vertexIndex] = position
          return { ...sl, polygon: newPolygon }
        }),
      },
    }))
  },

  addPolygonVertex: (sectionId: string, afterIndex: number, position: Vertex) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: state.pageLayout.sectionLayouts.map((sl) => {
          if (sl.sectionId !== sectionId) return sl
          const newPolygon = [...sl.polygon]
          newPolygon.splice(afterIndex + 1, 0, position)
          return { ...sl, polygon: newPolygon }
        }),
      },
    }))
  },

  removePolygonVertex: (sectionId: string, vertexIndex: number) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        sectionLayouts: state.pageLayout.sectionLayouts.map((sl) => {
          if (sl.sectionId !== sectionId || sl.polygon.length <= 3) return sl
          const newPolygon = sl.polygon.filter((_, i) => i !== vertexIndex)
          return { ...sl, polygon: newPolygon }
        }),
      },
    }))
  },

  // Multi-page management
  addPage: (name: string) => {
    set((state) => {
      let pages = state.pageLayout.pages
      if (!pages) {
        // Enable multi-page mode first: create initial page with all section IDs
        const allSectionIds = state.pageLayout.sectionLayouts.map((sl) => sl.sectionId)
        const uniqueIds = [...new Set(allSectionIds)]
        pages = [{
          id: nanoid(),
          name: 'Page 1',
          columnCount: state.pageLayout.columnCount,
          sectionIds: uniqueIds,
        }]
      }
      const newPage: PageDefinition = {
        id: nanoid(),
        name,
        columnCount: state.pageLayout.columnCount,
        sectionIds: [],
      }
      return {
        pageLayout: { ...state.pageLayout, pages: [...pages, newPage] },
      }
    })
  },

  removePage: (pageId: string) => {
    set((state) => {
      const pages = state.pageLayout.pages
      if (!pages || pages.length <= 1) return state
      const removed = pages.find((p) => p.id === pageId)
      const remaining = pages.filter((p) => p.id !== pageId)
      // Move orphaned sections to first remaining page
      if (removed && removed.sectionIds.length > 0) {
        remaining[0] = {
          ...remaining[0],
          sectionIds: [...remaining[0].sectionIds, ...removed.sectionIds],
        }
      }
      return {
        pageLayout: { ...state.pageLayout, pages: remaining },
      }
    })
  },

  renamePage: (pageId: string, name: string) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        pages: state.pageLayout.pages?.map((p) =>
          p.id === pageId ? { ...p, name } : p
        ),
      },
    }))
  },

  setPageColumnCount: (pageId: string, count: ColumnCount) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        pages: state.pageLayout.pages?.map((p) =>
          p.id === pageId ? { ...p, columnCount: count } : p
        ),
      },
    }))
  },

  assignSectionToPage: (sectionId: string, pageId: string) => {
    set((state) => {
      const pages = state.pageLayout.pages
      if (!pages) return state
      return {
        pageLayout: {
          ...state.pageLayout,
          pages: pages.map((p) => {
            if (p.id === pageId) {
              // Add section if not already present
              if (p.sectionIds.includes(sectionId)) return p
              return { ...p, sectionIds: [...p.sectionIds, sectionId] }
            }
            // Remove from other pages
            return { ...p, sectionIds: p.sectionIds.filter((id) => id !== sectionId) }
          }),
        },
      }
    })
  },

  reorderSectionInPage: (pageId: string, fromIndex: number, toIndex: number) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        pages: state.pageLayout.pages?.map((p) => {
          if (p.id !== pageId) return p
          const ids = [...p.sectionIds]
          const [removed] = ids.splice(fromIndex, 1)
          ids.splice(toIndex, 0, removed)
          return { ...p, sectionIds: ids }
        }),
      },
    }))
  },

  removeSectionFromPages: (sectionId: string) => {
    set((state) => {
      if (!state.pageLayout.pages) return state
      return {
        pageLayout: {
          ...state.pageLayout,
          pages: state.pageLayout.pages.map((p) => ({
            ...p,
            sectionIds: p.sectionIds.filter((id) => id !== sectionId),
          })),
        },
      }
    })
  },

  enableMultiPageMode: () => {
    set((state) => {
      if (state.pageLayout.pages) return state // already enabled
      const allSectionIds = state.pageLayout.sectionLayouts.map((sl) => sl.sectionId)
      const uniqueIds = [...new Set(allSectionIds)]
      // If no explicit layouts, collect section IDs from menu store
      // (caller should pass them). For now, use what we have.
      const page: PageDefinition = {
        id: nanoid(),
        name: 'Page 1',
        columnCount: state.pageLayout.columnCount,
        sectionIds: uniqueIds,
      }
      return {
        pageLayout: { ...state.pageLayout, pages: [page] },
      }
    })
  },

  disableMultiPageMode: () => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, pages: undefined },
    }))
  },

  setPrintMarks: (marks: Partial<PrintMarks>) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        printMarks: {
          bleed: 0.125,
          showCropMarks: false,
          showRegistrationMarks: false,
          ...state.pageLayout.printMarks,
          ...marks,
        },
      },
    }))
  },

  setShowDietaryLegend: (show: boolean) => {
    set((state) => ({
      pageLayout: { ...state.pageLayout, showDietaryLegend: show },
    }))
  },

  enableTriFold: (paperSize: TriFoldPaperSize = 'letter') => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        pageSize: paperSize,
        orientation: 'landscape' as Orientation,
        triFold: {
          enabled: true,
          paperSize,
          foldType: 'letter-fold',
          panelSections: {},
          coverShowTitle: true,
          coverShowSubtitle: true,
          coverShowLogo: true,
          backShowFooter: true,
        },
      },
    }))
  },

  disableTriFold: () => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        triFold: undefined,
      },
    }))
  },

  setTriFoldPaperSize: (paperSize: TriFoldPaperSize) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        pageSize: paperSize,
        triFold: state.pageLayout.triFold
          ? { ...state.pageLayout.triFold, paperSize }
          : undefined,
      },
    }))
  },

  setTriFoldPanelSections: (panel: TriFoldPanelRole, sectionIds: string[]) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        triFold: state.pageLayout.triFold
          ? {
              ...state.pageLayout.triFold,
              panelSections: {
                ...state.pageLayout.triFold.panelSections,
                [panel]: sectionIds,
              },
            }
          : undefined,
      },
    }))
  },

  setTriFoldType: (type: TriFoldType) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        triFold: state.pageLayout.triFold
          ? { ...state.pageLayout.triFold, foldType: type }
          : undefined,
      },
    }))
  },

  updateTriFoldConfig: (updates: Partial<TriFoldConfig>) => {
    set((state) => ({
      pageLayout: {
        ...state.pageLayout,
        triFold: state.pageLayout.triFold
          ? { ...state.pageLayout.triFold, ...updates }
          : undefined,
      },
    }))
  },

  setHeaderConfig: (config: Partial<HeaderConfig>) => {
    set((state) => {
      const existing = state.pageLayout.headerConfig ?? createDefaultHeaderConfig()
      return {
        pageLayout: {
          ...state.pageLayout,
          headerConfig: { ...existing, ...config },
        },
      }
    })
  },

  applyBatchUpdate: (updates: Partial<PageLayout>) => {
    set((state) => {
      let merged = { ...state.pageLayout, ...updates }

      // Deep-merge typography if provided
      if (updates.typography) {
        const t = { ...state.pageLayout.typography }
        for (const role of Object.keys(updates.typography) as (keyof TypographyConfig)[]) {
          t[role] = { ...t[role], ...updates.typography[role] }
        }
        merged.typography = t
      }

      // Cascade color scheme changes into typography (same logic as setColorScheme)
      if (updates.colorScheme) {
        const oldScheme = state.pageLayout.colorScheme
        const newScheme = { ...oldScheme, ...updates.colorScheme }
        merged.colorScheme = newScheme

        const colorMap: Array<{ oldColor: string; newColor: string }> = []
        if (updates.colorScheme.text && updates.colorScheme.text !== oldScheme.text) {
          colorMap.push({ oldColor: oldScheme.text, newColor: updates.colorScheme.text })
        }
        if (updates.colorScheme.accent && updates.colorScheme.accent !== oldScheme.accent) {
          colorMap.push({ oldColor: oldScheme.accent, newColor: updates.colorScheme.accent })
        }

        if (colorMap.length > 0) {
          const updated = { ...merged.typography }
          for (const role of Object.keys(updated) as (keyof TypographyConfig)[]) {
            const fontStyle = updated[role]
            for (const { oldColor, newColor } of colorMap) {
              if (fontStyle.color.toLowerCase() === oldColor.toLowerCase()) {
                updated[role] = { ...fontStyle, color: newColor }
                break
              }
            }
          }
          merged.typography = updated
        }
      }

      return { pageLayout: merged }
    })
  },

  loadPageLayout: (layout: PageLayout) => {
    set({ pageLayout: layout })
  },

  reset: () => {
    set({ pageLayout: createDefaultPageLayout() })
  },
}), { limit: 50 }))
