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
  HEIGHT_BUFFER,
} from './measure'
// Sections are placed in editor order (the order they arrive in the sections array)

/** A contiguous range [start, end) of section indices assigned to one column */
export interface ColumnGroup {
  start: number
  end: number
}

/**
 * Can N sections (with gaps) fit in K columns where no column exceeds maxHeight?
 * Greedy left-to-right: fill each column until adding the next section would exceed maxHeight.
 */
export function canPartition(heights: number[], k: number, maxHeight: number, vGapPx: number): boolean {
  let cols = 1
  let currentH = 0
  for (let i = 0; i < heights.length; i++) {
    const added = currentH === 0 ? heights[i] : heights[i] + vGapPx
    if (currentH + added > maxHeight) {
      // Start a new column with this section
      cols++
      if (cols > k) return false
      currentH = heights[i]
    } else {
      currentH += added
    }
  }
  return true
}

/**
 * Reconstruct the actual partition given the validated target height.
 * Returns ColumnGroup[] with [start, end) indices for each column.
 */
export function buildPartition(heights: number[], k: number, maxHeight: number, vGapPx: number): ColumnGroup[] {
  const groups: ColumnGroup[] = []
  let start = 0
  let currentH = 0

  for (let i = 0; i < heights.length; i++) {
    const added = currentH === 0 ? heights[i] : heights[i] + vGapPx
    if (currentH + added > maxHeight && i > start) {
      groups.push({ start, end: i })
      start = i
      currentH = heights[i]
    } else {
      currentH += added
    }
  }
  // Final group
  if (start < heights.length) {
    groups.push({ start, end: heights.length })
  }

  // If we have fewer groups than k (sections are short), pad with empty groups
  // pointing at the end so the caller doesn't break
  while (groups.length < k) {
    groups.push({ start: heights.length, end: heights.length })
  }

  return groups
}

/**
 * Divide N sections into K contiguous groups minimizing the maximum group height.
 * Uses binary search on the answer + greedy validation ("painter's partition").
 * Contiguous = sections stay in editor order.
 */
export function balancedPartition(heights: number[], k: number, vGapPx: number): ColumnGroup[] {
  if (heights.length === 0) {
    const empty: ColumnGroup[] = []
    for (let i = 0; i < k; i++) empty.push({ start: 0, end: 0 })
    return empty
  }

  if (k >= heights.length) {
    // More columns than sections → one per column
    const groups: ColumnGroup[] = heights.map((_, i) => ({ start: i, end: i + 1 }))
    while (groups.length < k) groups.push({ start: heights.length, end: heights.length })
    return groups
  }

  // Binary search on the maximum column height
  let lo = Math.max(...heights) // at least one section per column
  let hi = heights.reduce((a, b) => a + b, 0) + (heights.length - 1) * vGapPx // all in one column

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2
    if (canPartition(heights, k, mid, vGapPx)) {
      hi = mid
    } else {
      lo = mid
    }
  }

  return buildPartition(heights, k, Math.ceil(hi), vGapPx)
}

/**
 * Wrapper around findSplitPoint that avoids orphaned single items.
 * If continuation would have only 1 item, moves split back by 1 (so continuation gets ≥2).
 * Only adjusts if the first part still has ≥2 items after the move.
 */
export function findSplitPointWithOrphanGuard(
  section: MenuSection,
  typography: TypographyConfig,
  containerWidthPx: number,
  availableHeightPx: number,
  itemSeparator: string,
  startItemIndex: number,
  endItemIndex: number | undefined,
  variantDisplayMode?: VariantDisplayMode,
): { splitIndex: number; usedHeight: number } {
  const result = findSplitPoint(
    section,
    typography,
    containerWidthPx,
    availableHeightPx,
    itemSeparator as any,
    startItemIndex,
    variantDisplayMode,
  )

  const totalEnd = endItemIndex ?? (section.items?.length || 0)

  // Check if continuation would have only 1 item
  if (result.splitIndex < totalEnd && (totalEnd - result.splitIndex) === 1) {
    // Move split back by 1 so continuation gets 2 items
    const adjustedSplit = result.splitIndex - 1
    if (adjustedSplit - startItemIndex >= 2) {
      // Re-measure with adjusted split — find height up to adjustedSplit
      const adjusted = findSplitPoint(
        section,
        typography,
        containerWidthPx,
        Infinity, // no limit, just measure
        itemSeparator as any,
        startItemIndex,
        variantDisplayMode,
      )
      // We need to compute the actual height for items [startItemIndex, adjustedSplit)
      const partialHeight = estimatePartialSectionHeight(
        section,
        typography,
        containerWidthPx,
        itemSeparator as any,
        startItemIndex,
        adjustedSplit,
        variantDisplayMode,
      )
      return { splitIndex: adjustedSplit, usedHeight: partialHeight }
    }
  }

  return result
}

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
      pageLayout.sectionTitleDecoration,
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
 * Uses balanced contiguous partition to distribute sections across columns,
 * with optional section splitting and whitespace distribution.
 *
 * Phase A: Measure all section heights
 * Phase B: Use balancedPartition to assign contiguous section ranges to columns
 * Phase C: Place sections per column, splitting if needed
 * Phase D: Distribute whitespace evenly between sections in each column
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
  sectionTitleDeco?: import('../models/layout').SectionTitleDecoration,
): TreemapResult {
  const hGapPx = gridCols > 1 ? 16 : 0
  const totalHGapPx = (gridCols - 1) * hGapPx
  const colWidthPx = (contentWidthPx - totalHGapPx) / gridCols
  const colWidthPct = (colWidthPx / contentWidthPx) * 100
  const hGapPct = contentWidthPx > 0 ? (hGapPx / contentWidthPx) * 100 : 0
  const vGapPx = 8

  // ── Phase A: Measure all sections ──
  const measured: Fragment[] = sections.map((section) => {
    const result = estimateSectionHeight(section, typography, colWidthPx, 1, itemSeparator as any, variantDisplayMode, sectionTitleDeco)
    return {
      section,
      startItemIndex: 0,
      heightPx: (result.estimatedHeight + 4) * HEIGHT_BUFFER,
    }
  })

  // ── Phase B: Balanced partition ──
  const heights = measured.map((f) => f.heightPx)
  const groups = balancedPartition(heights, gridCols, vGapPx)

  // ── Phase C: Place & Split ──
  const watermarksPx = new Array(gridCols).fill(0)
  const assignments: Assignment[] = []

  // Build per-column queues from the partition groups
  const colQueues: Fragment[][] = groups.map((g) =>
    measured.slice(g.start, g.end).map((f) => ({ ...f }))
  )

  for (let col = 0; col < gridCols; col++) {
    const queue = colQueues[col]

    while (queue.length > 0) {
      const frag = queue.shift()!
      const remainingPx = availableHeightPx - watermarksPx[col]
      const itemCount = (frag.section.items || []).length
      const fragEnd = frag.endItemIndex ?? itemCount

      if (frag.heightPx <= remainingPx) {
        // Fits — place it
        assignments.push({
          section: frag.section,
          col,
          yPx: watermarksPx[col],
          heightPx: frag.heightPx,
          startItemIndex: frag.startItemIndex,
          endItemIndex: frag.endItemIndex,
        })
        watermarksPx[col] += frag.heightPx + vGapPx
      } else if (allowSplit && (fragEnd - frag.startItemIndex) > 1) {
        // Too tall — try splitting
        const splitBudgetPx = watermarksPx[col] < vGapPx * 2 ? availableHeightPx : remainingPx
        const splitResult = findSplitPointWithOrphanGuard(
          frag.section,
          typography,
          colWidthPx,
          splitBudgetPx / HEIGHT_BUFFER,
          itemSeparator,
          frag.startItemIndex,
          frag.endItemIndex,
          variantDisplayMode,
        )

        if (splitResult.splitIndex > frag.startItemIndex && splitResult.splitIndex < fragEnd) {
          // Split succeeded — place first part
          const firstPartHeight = splitResult.usedHeight * HEIGHT_BUFFER
          assignments.push({
            section: frag.section,
            col,
            yPx: watermarksPx[col],
            heightPx: firstPartHeight,
            startItemIndex: frag.startItemIndex,
            endItemIndex: splitResult.splitIndex,
          })
          watermarksPx[col] += firstPartHeight + vGapPx

          // Push remainder to next column's queue
          const remainderHeight = estimatePartialSectionHeight(
            frag.section,
            typography,
            colWidthPx,
            itemSeparator as any,
            splitResult.splitIndex,
            frag.endItemIndex,
            variantDisplayMode,
          )

          const remainderFrag: Fragment = {
            section: frag.section,
            startItemIndex: splitResult.splitIndex,
            endItemIndex: frag.endItemIndex,
            heightPx: (remainderHeight + 4) * HEIGHT_BUFFER,
          }

          if (col + 1 < gridCols) {
            colQueues[col + 1].unshift(remainderFrag)
          } else {
            // Last column — place overflow here
            queue.unshift(remainderFrag)
          }
        } else {
          // Can't split meaningfully — push to next column or overflow
          if (col + 1 < gridCols) {
            colQueues[col + 1].unshift(frag)
          } else {
            // Last column — place as overflow
            assignments.push({
              section: frag.section,
              col,
              yPx: watermarksPx[col],
              heightPx: frag.heightPx,
              startItemIndex: frag.startItemIndex,
              endItemIndex: frag.endItemIndex,
            })
            watermarksPx[col] += frag.heightPx + vGapPx
          }
        }
      } else {
        // Can't split — push to next column or overflow
        if (col + 1 < gridCols && frag.heightPx > remainingPx) {
          colQueues[col + 1].unshift(frag)
        } else {
          assignments.push({
            section: frag.section,
            col,
            yPx: watermarksPx[col],
            heightPx: frag.heightPx,
            startItemIndex: frag.startItemIndex,
            endItemIndex: frag.endItemIndex,
          })
          watermarksPx[col] += frag.heightPx + vGapPx
        }
      }
    }
  }

  // ── Phase D: Stack sections from top of each column at natural height ──
  for (let col = 0; col < gridCols; col++) {
    const colAssignments = assignments.filter((a) => a.col === col)
    if (colAssignments.length === 0) continue

    let y = 0
    for (let i = 0; i < colAssignments.length; i++) {
      colAssignments[i].yPx = y
      y += colAssignments[i].heightPx + (i < colAssignments.length - 1 ? vGapPx : 0)
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
export function scaleTypography(typography: TypographyConfig, scale: number): TypographyConfig {
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
