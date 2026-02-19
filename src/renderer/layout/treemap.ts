import type { SectionLayout, ColumnCount, VariantDisplayMode } from '../models/layout'
import type { MenuSection } from '../models/menu'
import type { PageLayout, TypographyConfig } from '../models/layout'
import { PAGE_SIZES } from '../models/layout'
import { rectToPolygon } from './polygon'
import {
  estimateHeaderHeight,
  estimateFooterHeight,
  estimateSectionHeight,
  estimatePartialSectionHeight,
  findSplitPoint,
} from './measure'
import { sectionSortKey } from './section-order'

export interface TreemapResult {
  sectionLayouts: SectionLayout[]
  overflow: boolean
  overflowPercent: number
  /** Column count used for this layout */
  columnCount: ColumnCount
  /** Font scale applied (1.0 = original) */
  fontScale: number
}

const DPI = 96
const HEIGHT_BUFFER = 1.15 // 15% safety margin on height estimates

/**
 * Smart single-page grid layout.
 *
 * Tries many configurations (column counts × font scales × splitting modes)
 * to find the best layout that fits everything on one page.
 * Supports section splitting: when a section is too tall for a column,
 * it splits across columns without repeating the header.
 */
export function computeTreemapLayout(input: {
  sections: MenuSection[]
  pageLayout: PageLayout
  menuData: { title: string; subtitle: string; footer: string; logo?: any }
}): TreemapResult {
  const { sections, pageLayout, menuData } = input

  if (sections.length === 0) {
    return { sectionLayouts: [], overflow: false, overflowPercent: 0, columnCount: 1, fontScale: 1.0 }
  }

  const pageDims = PAGE_SIZES[pageLayout.pageSize]
  const pageWidthInches = pageLayout.orientation === 'portrait' ? pageDims.width : pageDims.height
  const pageHeightInches = pageLayout.orientation === 'portrait' ? pageDims.height : pageDims.width
  const contentWidthPx = (pageWidthInches - pageLayout.margins.left - pageLayout.margins.right) * DPI
  const contentHeightPx = (pageHeightInches - pageLayout.margins.top - pageLayout.margins.bottom) * DPI

  // Honor the user's chosen column count — only vary font scale and splitting
  const userCols = (pageLayout.columnCount || 1) as ColumnCount

  // Build configs: try the user's column count first with progressively
  // more aggressive strategies, then fall back to other column counts
  const configs: { cols: ColumnCount; fontScale: number; allowSplit: boolean }[] = [
    // User's chosen columns — no splitting
    { cols: userCols, fontScale: 1.0, allowSplit: false },
    // User's chosen columns — with splitting
    { cols: userCols, fontScale: 1.0, allowSplit: true },
    // User's chosen columns — font reduction + splitting
    { cols: userCols, fontScale: 0.9, allowSplit: false },
    { cols: userCols, fontScale: 0.9, allowSplit: true },
    { cols: userCols, fontScale: 0.8, allowSplit: false },
    { cols: userCols, fontScale: 0.8, allowSplit: true },
    { cols: userCols, fontScale: 0.7, allowSplit: true },
    { cols: userCols, fontScale: 0.6, allowSplit: true },
  ]

  let bestResult: TreemapResult | null = null
  let bestOverflow = Infinity

  for (const config of configs) {
    const scaledTypography = scaleTypography(pageLayout.typography, config.fontScale)

    const headerH = estimateHeaderHeight(menuData as any, scaledTypography)
    const footerH = estimateFooterHeight(menuData.footer, scaledTypography)
    const availableHeightPx = contentHeightPx - headerH - footerH

    const result = tryGridLayout(
      sections,
      config.cols,
      contentWidthPx,
      availableHeightPx,
      scaledTypography,
      pageLayout.itemSeparator,
      config.fontScale,
      config.allowSplit,
      pageLayout.variantDisplayMode,
    )

    if (!result.overflow) {
      return result // Found a fit — use it
    }

    if (result.overflowPercent < bestOverflow) {
      bestOverflow = result.overflowPercent
      bestResult = result
    }
  }

  return bestResult!
}

/** A fragment is either a whole section or a partial section (split continuation) */
interface Fragment {
  section: MenuSection
  startItemIndex: number
  endItemIndex?: number   // undefined = all remaining items
  heightPx: number
}

interface Assignment {
  section: MenuSection
  col: number
  yPx: number
  heightPx: number
  startItemIndex: number
  endItemIndex?: number
}

/**
 * Try a grid layout with specific column count.
 * Uses balanced bin-packing with optional section splitting.
 *
 * When allowSplit is true and a section doesn't fit in any column,
 * it splits the section: items that fit go in the current column,
 * remaining items continue in the next available column (no header repeat).
 */
function tryGridLayout(
  sections: MenuSection[],
  gridCols: ColumnCount,
  contentWidthPx: number,
  availableHeightPx: number,
  typography: TypographyConfig,
  itemSeparator: string,
  fontScale: number,
  allowSplit: boolean,
  variantDisplayMode?: VariantDisplayMode,
): TreemapResult {
  const hGapPx = gridCols > 1 ? 16 : 0
  const totalHGapPx = (gridCols - 1) * hGapPx
  const colWidthPx = (contentWidthPx - totalHGapPx) / gridCols
  const colWidthPct = (colWidthPx / contentWidthPx) * 100
  const hGapPct = contentWidthPx > 0 ? (hGapPx / contentWidthPx) * 100 : 0
  const vGapPx = 8

  // Measure all sections
  const fragments: Fragment[] = sections.map((section) => {
    const result = estimateSectionHeight(section, typography, colWidthPx, 1, itemSeparator as any, variantDisplayMode)
    return {
      section,
      startItemIndex: 0,
      heightPx: (result.estimatedHeight + 16) * HEIGHT_BUFFER,
    }
  })

  // Sort by semantic menu order (appetizers first, desserts/drinks last)
  fragments.sort((a, b) => sectionSortKey(a.section.title) - sectionSortKey(b.section.title))

  const watermarksPx = new Array(gridCols).fill(0)
  const assignments: Assignment[] = []

  // Process queue — fragments may be added during splitting
  const queue = [...fragments]

  while (queue.length > 0) {
    const frag = queue.shift()!

    // Find column with the most remaining space
    let bestCol = 0
    for (let c = 1; c < gridCols; c++) {
      if (watermarksPx[c] < watermarksPx[bestCol]) bestCol = c
    }

    const remainingPx = availableHeightPx - watermarksPx[bestCol]
    const itemCount = (frag.section.items || []).length
    const fragEnd = frag.endItemIndex ?? itemCount

    if (frag.heightPx <= remainingPx) {
      // Fits — place it
      assignments.push({
        section: frag.section,
        col: bestCol,
        yPx: watermarksPx[bestCol],
        heightPx: frag.heightPx,
        startItemIndex: frag.startItemIndex,
        endItemIndex: frag.endItemIndex,
      })
      watermarksPx[bestCol] += frag.heightPx + vGapPx
    } else if (allowSplit && (fragEnd - frag.startItemIndex) > 1) {
      // Doesn't fit but we can try splitting
      const splitResult = findSplitPoint(
        frag.section,
        typography,
        colWidthPx,
        remainingPx / HEIGHT_BUFFER, // un-buffer for the split calculation
        itemSeparator as any,
        frag.startItemIndex,
        variantDisplayMode,
      )

      if (splitResult.splitIndex > frag.startItemIndex && splitResult.splitIndex < fragEnd) {
        // Successfully split — place first part
        const firstPartHeight = splitResult.usedHeight * HEIGHT_BUFFER
        assignments.push({
          section: frag.section,
          col: bestCol,
          yPx: watermarksPx[bestCol],
          heightPx: firstPartHeight,
          startItemIndex: frag.startItemIndex,
          endItemIndex: splitResult.splitIndex,
        })
        watermarksPx[bestCol] += firstPartHeight + vGapPx

        // Queue the remainder
        const remainderHeight = estimatePartialSectionHeight(
          frag.section,
          typography,
          colWidthPx,
          itemSeparator as any,
          splitResult.splitIndex,
          frag.endItemIndex,
          variantDisplayMode,
        )

        queue.push({
          section: frag.section,
          startItemIndex: splitResult.splitIndex,
          endItemIndex: frag.endItemIndex,
          heightPx: (remainderHeight + 16) * HEIGHT_BUFFER,
        })

        // Re-sort queue by height desc for better packing of remainder
        queue.sort((a, b) => b.heightPx - a.heightPx)
      } else {
        // Can't split meaningfully — place it as-is (will overflow)
        assignments.push({
          section: frag.section,
          col: bestCol,
          yPx: watermarksPx[bestCol],
          heightPx: frag.heightPx,
          startItemIndex: frag.startItemIndex,
          endItemIndex: frag.endItemIndex,
        })
        watermarksPx[bestCol] += frag.heightPx + vGapPx
      }
    } else {
      // No splitting allowed or only 1 item — place as-is
      assignments.push({
        section: frag.section,
        col: bestCol,
        yPx: watermarksPx[bestCol],
        heightPx: frag.heightPx,
        startItemIndex: frag.startItemIndex,
        endItemIndex: frag.endItemIndex,
      })
      watermarksPx[bestCol] += frag.heightPx + vGapPx
    }
  }

  // Convert to percentage-based polygons
  const maxWatermarkPx = Math.max(...watermarksPx)
  const overflow = maxWatermarkPx > availableHeightPx
  const overflowPercent = availableHeightPx > 0
    ? Math.round(Math.max(0, (maxWatermarkPx - availableHeightPx) / availableHeightPx * 100))
    : 0

  const sectionLayouts: SectionLayout[] = assignments.map((a) => {
    const x = a.col * (colWidthPct + hGapPct)
    const y = availableHeightPx > 0 ? (a.yPx / availableHeightPx) * 100 : 0
    const h = availableHeightPx > 0 ? (a.heightPx / availableHeightPx) * 100 : 0

    return {
      sectionId: a.section.id,
      polygon: rectToPolygon(x, y, colWidthPct, h),
      columnCount: 1,
      pageIndex: 0,
      startItemIndex: a.startItemIndex > 0 ? a.startItemIndex : undefined,
      endItemIndex: a.endItemIndex,
    }
  })

  return {
    sectionLayouts,
    overflow,
    overflowPercent,
    columnCount: gridCols,
    fontScale,
  }
}

/** Scale all font sizes in a typography config */
function scaleTypography(typography: TypographyConfig, scale: number): TypographyConfig {
  if (scale >= 1.0) return typography
  const s = (style: any) => ({
    ...style,
    fontSize: Math.max(6, Math.round(style.fontSize * scale)),
  })
  return {
    menuTitle: s(typography.menuTitle),
    menuSubtitle: s(typography.menuSubtitle),
    sectionTitle: s(typography.sectionTitle),
    sectionSubtitle: s(typography.sectionSubtitle),
    itemName: s(typography.itemName),
    itemDescription: s(typography.itemDescription),
    itemPrice: s(typography.itemPrice),
    footer: s(typography.footer),
  }
}
