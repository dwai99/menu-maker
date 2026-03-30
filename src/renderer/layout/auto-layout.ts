import type { PageLayout, SectionLayout, ColumnCount, PageDefinition } from '../models/layout'
import { PAGE_SIZES } from '../models/layout'
import type { MenuData, MenuSection } from '../models/menu'
import { rectToPolygon } from './polygon'
import {
  estimateHeaderHeight,
  estimateFooterHeight,
  estimateSectionHeight,
  estimatePartialSectionHeight,
  findSplitPoint,
  HEIGHT_BUFFER,
} from './measure'
import { computeTreemapLayout, balancedPartition, findSplitPointWithOrphanGuard, type TreemapResult } from './treemap'
// Sections are placed in editor order (the order they arrive in the sections array)

export interface AutoLayoutResult {
  sectionLayouts: SectionLayout[]
  pageCount: number
  overflow?: boolean
  overflowPercent?: number
  /** The column count used */
  columnCount: ColumnCount
  /** Font scale applied (1.0 = no change) */
  fontScale: number
}

/**
 * Compute automatic layout — tries hard to fit on one page first,
 * then automatically falls back to multi-page flow if it doesn't fit.
 * Dispatches to vertical (treemap) or horizontal layout based on layoutDirection.
 */
export function computeAutoLayout(input: {
  sections: MenuSection[]
  pageLayout: PageLayout
  menuData: MenuData
}): AutoLayoutResult {
  if (input.pageLayout.layoutDirection === 'horizontal') {
    const result = computeHorizontalLayout(input)
    // If horizontal overflows, fall back to multi-page flow
    if (result.overflow) {
      return computeFlowLayout(input)
    }
    return result
  }

  const result = computeTreemapLayout(input)
  const singlePage: AutoLayoutResult = {
    sectionLayouts: result.sectionLayouts,
    pageCount: 1,
    overflow: result.overflow,
    overflowPercent: result.overflowPercent,
    columnCount: result.columnCount,
    fontScale: result.fontScale,
  }

  // If single-page still overflows after all strategies, go multi-page
  if (singlePage.overflow) {
    return computeFlowLayout(input)
  }

  return singlePage
}

const DPI = 96

/**
 * Horizontal layout — sections arranged in rows left-to-right.
 * Sections are chunked into rows of N (N = columnCount).
 * Each section in a row gets equal width; row height is proportional
 * to the tallest section in that row.
 */
function computeHorizontalLayout(input: {
  sections: MenuSection[]
  pageLayout: PageLayout
  menuData: MenuData
}): AutoLayoutResult {
  const { sections, pageLayout, menuData } = input

  if (sections.length === 0) {
    return { sectionLayouts: [], pageCount: 1, columnCount: 1, fontScale: 1.0 }
  }

  const pageDims = PAGE_SIZES[pageLayout.pageSize]
  const pageWidthInches = pageLayout.orientation === 'portrait' ? pageDims.width : pageDims.height
  const pageHeightInches = pageLayout.orientation === 'portrait' ? pageDims.height : pageDims.width
  const contentWidthPx = (pageWidthInches - pageLayout.margins.left - pageLayout.margins.right) * DPI
  const contentHeightPx = (pageHeightInches - pageLayout.margins.top - pageLayout.margins.bottom) * DPI

  const headerH = estimateHeaderHeight(menuData as any, pageLayout.typography)
  const footerH = estimateFooterHeight(menuData.footer, pageLayout.typography)
  const availableHeightPx = contentHeightPx - headerH - footerH

  const gridCols = Math.max(1, pageLayout.columnCount || 1) as ColumnCount
  const hGapPx = gridCols > 1 ? 16 : 0
  const totalHGapPx = (gridCols - 1) * hGapPx
  const colWidthPx = (contentWidthPx - totalHGapPx) / gridCols
  const colWidthPct = (colWidthPx / contentWidthPx) * 100
  const hGapPct = contentWidthPx > 0 ? (hGapPx / contentWidthPx) * 100 : 0
  const vGapPx = 8

  // Measure heights (editor order preserved)
  const measured = sections.map((section) => {
    const result = estimateSectionHeight(section, pageLayout.typography, colWidthPx, 1, pageLayout.itemSeparator as any, pageLayout.variantDisplayMode, pageLayout.sectionTitleDecoration)
    return {
      section,
      heightPx: (result.estimatedHeight + 4) * HEIGHT_BUFFER,
    }
  })

  // Chunk into rows of gridCols
  const rows: typeof measured[] = []
  for (let i = 0; i < measured.length; i += gridCols) {
    rows.push(measured.slice(i, i + gridCols))
  }

  // Lay out rows
  const layouts: SectionLayout[] = []
  let yPx = 0

  for (const row of rows) {
    const rowHeightPx = Math.max(...row.map((m) => m.heightPx))
    const colsInRow = row.length

    for (let c = 0; c < colsInRow; c++) {
      const x = c * (colWidthPct + hGapPct)
      const yPct = availableHeightPx > 0 ? (yPx / availableHeightPx) * 100 : 0
      const hPct = availableHeightPx > 0 ? (rowHeightPx / availableHeightPx) * 100 : 0

      layouts.push({
        sectionId: row[c].section.id,
        polygon: rectToPolygon(x, yPct, colWidthPct, hPct),
        columnCount: 1,
        pageIndex: 0,
      })
    }

    yPx += rowHeightPx + vGapPx
  }

  const overflow = yPx > availableHeightPx
  const overflowPercent = availableHeightPx > 0
    ? Math.round(Math.max(0, (yPx - availableHeightPx) / availableHeightPx * 100))
    : 0

  return {
    sectionLayouts: layouts,
    pageCount: 1,
    overflow,
    overflowPercent,
    columnCount: gridCols,
    fontScale: 1.0,
  }
}

/**
 * Multi-page flow layout using the same column grid.
 * Uses balanced partition per-page to distribute sections across columns evenly.
 * Supports section splitting: if a section is too tall for the remaining
 * column space, it splits — items that fit go here, the rest continue
 * in the next column or page.
 */
export function computeFlowLayout(input: {
  sections: MenuSection[]
  pageLayout: PageLayout
  menuData: MenuData
}): AutoLayoutResult {
  const { sections, pageLayout, menuData } = input

  const pageDims = PAGE_SIZES[pageLayout.pageSize]
  const pageWidthInches = pageLayout.orientation === 'portrait' ? pageDims.width : pageDims.height
  const pageHeightInches = pageLayout.orientation === 'portrait' ? pageDims.height : pageDims.width
  const contentWidthPx = (pageWidthInches - pageLayout.margins.left - pageLayout.margins.right) * DPI
  const contentHeightPx = (pageHeightInches - pageLayout.margins.top - pageLayout.margins.bottom) * DPI

  const headerHeight = estimateHeaderHeight(menuData, pageLayout.typography)
  const footerHeight = estimateFooterHeight(menuData.footer, pageLayout.typography)
  const sectionsHeightPx = contentHeightPx - headerHeight - footerHeight

  const gridCols = Math.max(1, pageLayout.columnCount || 1)
  const hGapPx = gridCols > 1 ? 16 : 0
  const colWidthPx = (contentWidthPx - (gridCols - 1) * hGapPx) / gridCols
  const colWidthPct = (colWidthPx / contentWidthPx) * 100
  const hGapPct = contentWidthPx > 0 ? (hGapPx / contentWidthPx) * 100 : 0
  const vGapPx = 8
  const vGapPct = sectionsHeightPx > 0 ? (vGapPx / sectionsHeightPx) * 100 : 0

  const flowLayouts: SectionLayout[] = []
  let currentPage = 0

  // ── Step 1: Measure all sections ──
  interface MeasuredSection {
    section: MenuSection
    heightPx: number
    heightPct: number
    startIdx?: number  // preserved from overflow continuation fragments
    endIdx?: number
  }
  const allMeasured: MeasuredSection[] = sections.map((section) => {
    const result = estimateSectionHeight(section, pageLayout.typography, colWidthPx, 1, pageLayout.itemSeparator, pageLayout.variantDisplayMode, pageLayout.sectionTitleDecoration)
    const heightPx = (result.estimatedHeight + 4) * HEIGHT_BUFFER
    return {
      section,
      heightPx,
      heightPct: sectionsHeightPx > 0 ? (heightPx / sectionsHeightPx) * 100 : 0,
    }
  })

  // ── Step 2: Group sections into pages ──
  // Scan sequentially: accumulate heights until total exceeds page capacity
  const pageCapacityPx = sectionsHeightPx * gridCols
  const pageGroups: MeasuredSection[][] = []
  let currentGroup: MeasuredSection[] = []
  let groupTotalPx = 0

  for (const ms of allMeasured) {
    if (currentGroup.length > 0 && groupTotalPx + ms.heightPx > pageCapacityPx) {
      pageGroups.push(currentGroup)
      currentGroup = []
      groupTotalPx = 0
    }
    currentGroup.push(ms)
    groupTotalPx += ms.heightPx
  }
  if (currentGroup.length > 0) {
    pageGroups.push(currentGroup)
  }

  // ── Step 3: Within each page, use balanced partition ──
  for (const pageGroup of pageGroups) {
    const heights = pageGroup.map((ms) => ms.heightPx)
    const groups = balancedPartition(heights, gridCols, vGapPx)

    // Build per-column queues from partition
    interface Frag {
      section: MenuSection
      startIdx: number
      endIdx?: number
      heightPx: number
      heightPct: number
    }

    const colQueues: Frag[][] = groups.map((g) =>
      pageGroup.slice(g.start, g.end).map((ms) => ({
        section: ms.section,
        startIdx: ms.startIdx ?? 0,
        endIdx: ms.endIdx,
        heightPx: ms.heightPx,
        heightPct: ms.heightPct,
      }))
    )

    // Track per-column watermarks in percentage (0-100)
    const watermarks = new Array(gridCols).fill(0)

    // Track assignments for whitespace distribution
    interface FlowAssignment {
      sectionId: string
      col: number
      yPct: number
      heightPct: number
      pageIndex: number
      startItemIndex?: number
      endItemIndex?: number
    }
    const pageAssignments: FlowAssignment[] = []

    for (let col = 0; col < gridCols; col++) {
      const queue = colQueues[col]

      while (queue.length > 0) {
        const frag = queue.shift()!
        const itemCount = frag.section.items?.length || 0
        const fragEnd = frag.endIdx ?? itemCount

        // Re-measure if this is a continuation fragment
        let heightPct = frag.heightPct
        let heightPx = frag.heightPx
        if (frag.startIdx > 0) {
          const partialH = estimatePartialSectionHeight(frag.section, pageLayout.typography, colWidthPx, pageLayout.itemSeparator, frag.startIdx, frag.endIdx, pageLayout.variantDisplayMode)
          heightPx = (partialH + 4) * HEIGHT_BUFFER
          heightPct = sectionsHeightPx > 0 ? (heightPx / sectionsHeightPx) * 100 : 0
        }

        const remainingPct = 100 - watermarks[col]
        const colIsEmpty = watermarks[col] < vGapPct * 2

        // Case 1: Fits in remaining space
        if (heightPct <= remainingPct) {
          pageAssignments.push({
            sectionId: frag.section.id,
            col,
            yPct: watermarks[col],
            heightPct,
            pageIndex: currentPage,
            startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
            endItemIndex: frag.endIdx,
          })
          watermarks[col] += heightPct + vGapPct
          continue
        }

        // Case 2: Section fits whole in a column (within tolerance) — keep together
        if (heightPct <= 115 && heightPct <= 100) {
          if (colIsEmpty) {
            pageAssignments.push({
              sectionId: frag.section.id,
              col,
              yPct: 0,
              heightPct,
              pageIndex: currentPage,
              startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
              endItemIndex: frag.endIdx,
            })
            watermarks[col] = heightPct + vGapPct
            continue
          }
          // Push to next column
          if (col + 1 < gridCols) {
            colQueues[col + 1].unshift(frag)
          } else {
            // Overflow to next page — re-queue
            colQueues[col].unshift(frag)
            break
          }
          continue
        }

        // Case 3: Must split
        const remainingPx = (remainingPct / 100) * sectionsHeightPx

        // If column is partially used with little space, push to next column
        if (!colIsEmpty && remainingPx < sectionsHeightPx * 0.3) {
          if (col + 1 < gridCols) {
            colQueues[col + 1].unshift(frag)
          } else {
            colQueues[col].unshift(frag)
            break
          }
          continue
        }

        const splitBudgetPx = colIsEmpty ? sectionsHeightPx : remainingPx
        if ((fragEnd - frag.startIdx) > 1) {
          const splitResult = findSplitPointWithOrphanGuard(
            frag.section,
            pageLayout.typography,
            colWidthPx,
            splitBudgetPx / HEIGHT_BUFFER,
            pageLayout.itemSeparator,
            frag.startIdx,
            frag.endIdx,
            pageLayout.variantDisplayMode,
          )

          if (splitResult.splitIndex > frag.startIdx && splitResult.splitIndex < fragEnd) {
            const usedPct = sectionsHeightPx > 0 ? (splitResult.usedHeight * HEIGHT_BUFFER / sectionsHeightPx) * 100 : 0
            pageAssignments.push({
              sectionId: frag.section.id,
              col,
              yPct: watermarks[col],
              heightPct: Math.min(usedPct, 100 - watermarks[col]),
              pageIndex: currentPage,
              startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
              endItemIndex: splitResult.splitIndex,
            })
            watermarks[col] += usedPct + vGapPct

            // Push remainder to next column
            const remainderFrag: Frag = {
              section: frag.section,
              startIdx: splitResult.splitIndex,
              endIdx: frag.endIdx,
              heightPx: 0,
              heightPct: 0,
            }
            if (col + 1 < gridCols) {
              colQueues[col + 1].unshift(remainderFrag)
            } else {
              queue.unshift(remainderFrag)
            }
            continue
          }
        }

        // Case 4: Can't split — place as-is or push
        if (colIsEmpty) {
          pageAssignments.push({
            sectionId: frag.section.id,
            col,
            yPct: 0,
            heightPct: Math.min(heightPct, 100),
            pageIndex: currentPage,
            startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
            endItemIndex: frag.endIdx,
          })
          watermarks[col] = Math.min(heightPct, 100) + vGapPct
          continue
        }

        if (col + 1 < gridCols) {
          colQueues[col + 1].unshift(frag)
        } else {
          colQueues[col].unshift(frag)
          break
        }
      }
    }

    // ── Stack sections from top of each column at natural height ──
    for (let col = 0; col < gridCols; col++) {
      const colAssignments = pageAssignments.filter((a) => a.col === col && a.pageIndex === currentPage)
      if (colAssignments.length === 0) continue

      let y = 0
      for (let i = 0; i < colAssignments.length; i++) {
        colAssignments[i].yPct = y
        y += colAssignments[i].heightPct + (i < colAssignments.length - 1 ? vGapPct : 0)
      }
    }

    // Convert assignments to SectionLayouts
    for (const a of pageAssignments) {
      flowLayouts.push({
        sectionId: a.sectionId,
        polygon: rectToPolygon(a.col * (colWidthPct + hGapPct), a.yPct, colWidthPct, a.heightPct),
        columnCount: 1,
        pageIndex: a.pageIndex,
        startItemIndex: a.startItemIndex,
        endItemIndex: a.endItemIndex,
      })
    }

    // Check for overflow sections that didn't fit on this page
    const overflowFrags: Frag[] = []
    for (const queue of colQueues) {
      overflowFrags.push(...queue)
    }

    if (overflowFrags.length > 0) {
      // Re-queue overflow sections for the next page
      currentPage++
      // Create a new page group from the overflow — preserve startIdx/endIdx
      // so continuation fragments render the correct item range on the next page.
      const overflowMeasured: MeasuredSection[] = overflowFrags.map((f) => {
        const hPx = f.startIdx > 0
          ? (estimatePartialSectionHeight(f.section, pageLayout.typography, colWidthPx, pageLayout.itemSeparator, f.startIdx, f.endIdx, pageLayout.variantDisplayMode) + 4) * HEIGHT_BUFFER
          : f.heightPx
        return {
          section: f.section,
          heightPx: hPx,
          heightPct: sectionsHeightPx > 0 ? (hPx / sectionsHeightPx) * 100 : 0,
          startIdx: f.startIdx > 0 ? f.startIdx : undefined,
          endIdx: f.endIdx,
        }
      })
      // Push overflow as a new page group to process
      pageGroups.push(overflowMeasured)
    } else {
      currentPage++
    }
  }

  return {
    sectionLayouts: flowLayouts,
    pageCount: Math.max(1, currentPage),
    columnCount: pageLayout.columnCount || 1,
    fontScale: 1.0,
  }
}

/**
 * Multi-page layout: runs computeAutoLayout independently per page.
 * Each page gets only its assigned sections. Stamps correct pageIndex.
 * Header/title only on first page, footer only on last page.
 */
export function computeMultiPageLayout(input: {
  pages: PageDefinition[]
  sections: MenuSection[]
  pageLayout: PageLayout
  menuData: MenuData
}): AutoLayoutResult {
  const { pages, sections, pageLayout, menuData } = input
  const sectionMap = new Map(sections.map((s) => [s.id, s]))

  const allLayouts: SectionLayout[] = []
  let totalPageCount = 0
  let minFontScale = 1.0

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageDef = pages[pageIdx]
    const pageSections = pageDef.sectionIds
      .map((id) => sectionMap.get(id))
      .filter((s): s is MenuSection => s != null)

    if (pageSections.length === 0) {
      totalPageCount++
      continue
    }

    // Build a per-page layout override with the page's column count
    const perPageLayout: PageLayout = {
      ...pageLayout,
      columnCount: pageDef.columnCount,
    }

    // Build menuData variant: header only on first page, footer only on last
    const isFirst = pageIdx === 0
    const isLast = pageIdx === pages.length - 1
    const perPageMenuData: MenuData = {
      ...menuData,
      title: isFirst ? menuData.title : '',
      subtitle: isFirst ? menuData.subtitle : '',
      logo: isFirst ? menuData.logo : undefined,
      footer: isLast ? menuData.footer : '',
    }

    const result = computeAutoLayout({
      sections: pageSections,
      pageLayout: perPageLayout,
      menuData: perPageMenuData,
    })

    // Stamp correct pageIndex on all resulting layouts
    const pageBaseIndex = totalPageCount
    for (const sl of result.sectionLayouts) {
      allLayouts.push({
        ...sl,
        pageIndex: pageBaseIndex + sl.pageIndex,
      })
    }

    totalPageCount += result.pageCount
    if (result.fontScale < minFontScale) {
      minFontScale = result.fontScale
    }
  }

  return {
    sectionLayouts: allLayouts,
    pageCount: Math.max(1, totalPageCount),
    columnCount: pageLayout.columnCount || 1,
    fontScale: minFontScale,
  }
}
