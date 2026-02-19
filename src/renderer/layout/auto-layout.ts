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
} from './measure'
import { computeTreemapLayout, type TreemapResult } from './treemap'
import { sortSections } from './section-order'

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
const HEIGHT_BUFFER = 1.15

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

  // Sort sections semantically
  const sorted = sortSections(sections)

  // Measure heights
  const measured = sorted.map((section) => {
    const result = estimateSectionHeight(section, pageLayout.typography, colWidthPx, 1, pageLayout.itemSeparator as any, pageLayout.variantDisplayMode)
    return {
      section,
      heightPx: (result.estimatedHeight + 16) * HEIGHT_BUFFER,
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
  let watermarks = new Array(gridCols).fill(0) // in percent (0-100)

  /** Find column with least content on current page */
  const findBestCol = () => {
    let best = 0
    for (let c = 1; c < gridCols; c++) {
      if (watermarks[c] < watermarks[best]) best = c
    }
    return best
  }

  /** Advance to next page, resetting watermarks */
  const nextPage = () => {
    currentPage++
    watermarks = new Array(gridCols).fill(0)
  }

  // Process each section, potentially splitting across columns/pages
  interface Frag {
    section: MenuSection
    startIdx: number
    endIdx?: number
  }
  const queue: Frag[] = sections.map((s) => ({ section: s, startIdx: 0 }))

  while (queue.length > 0) {
    const frag = queue.shift()!
    const itemCount = frag.section.items?.length || 0
    const fragEnd = frag.endIdx ?? itemCount

    // Measure this fragment's height
    const heightResult = frag.startIdx === 0
      ? estimateSectionHeight(frag.section, pageLayout.typography, colWidthPx, 1, pageLayout.itemSeparator, pageLayout.variantDisplayMode)
      : { estimatedHeight: estimatePartialSectionHeight(frag.section, pageLayout.typography, colWidthPx, pageLayout.itemSeparator, frag.startIdx, frag.endIdx, pageLayout.variantDisplayMode) }

    const heightPx = (heightResult.estimatedHeight + 16) * HEIGHT_BUFFER
    const heightPct = sectionsHeightPx > 0 ? (heightPx / sectionsHeightPx) * 100 : 0

    let bestCol = findBestCol()
    const remainingPct = 100 - watermarks[bestCol]

    // Case 1: Fits in best column
    if (heightPct <= remainingPct) {
      flowLayouts.push({
        sectionId: frag.section.id,
        polygon: rectToPolygon(bestCol * (colWidthPct + hGapPct), watermarks[bestCol], colWidthPct, heightPct),
        columnCount: 1,
        pageIndex: currentPage,
        startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
        endItemIndex: frag.endIdx,
      })
      watermarks[bestCol] += heightPct + vGapPct
      continue
    }

    // Case 2: Doesn't fit — try splitting if there's some space and multiple items
    const remainingPx = (remainingPct / 100) * sectionsHeightPx
    if (remainingPx > 60 && (fragEnd - frag.startIdx) > 1) {
      const splitResult = findSplitPoint(
        frag.section,
        pageLayout.typography,
        colWidthPx,
        remainingPx / HEIGHT_BUFFER,
        pageLayout.itemSeparator,
        frag.startIdx,
        pageLayout.variantDisplayMode,
      )

      if (splitResult.splitIndex > frag.startIdx && splitResult.splitIndex < fragEnd) {
        // Place first part in current column
        const usedPct = sectionsHeightPx > 0 ? (splitResult.usedHeight * HEIGHT_BUFFER / sectionsHeightPx) * 100 : 0
        flowLayouts.push({
          sectionId: frag.section.id,
          polygon: rectToPolygon(bestCol * (colWidthPct + hGapPct), watermarks[bestCol], colWidthPct, usedPct),
          columnCount: 1,
          pageIndex: currentPage,
          startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
          endItemIndex: splitResult.splitIndex,
        })
        watermarks[bestCol] += usedPct + vGapPct

        // Queue the remainder (will land in next column or page)
        queue.unshift({ section: frag.section, startIdx: splitResult.splitIndex, endIdx: frag.endIdx })
        continue
      }
    }

    // Case 3: Column is empty but section is just too tall — place what fits then split
    if (watermarks[bestCol] < vGapPct) {
      // Empty column but section still overflows — force place + split
      if ((fragEnd - frag.startIdx) > 1) {
        const splitResult = findSplitPoint(
          frag.section,
          pageLayout.typography,
          colWidthPx,
          sectionsHeightPx / HEIGHT_BUFFER,
          pageLayout.itemSeparator,
          frag.startIdx,
          pageLayout.variantDisplayMode,
        )
        if (splitResult.splitIndex > frag.startIdx) {
          const usedPct = sectionsHeightPx > 0 ? (splitResult.usedHeight * HEIGHT_BUFFER / sectionsHeightPx) * 100 : 0
          flowLayouts.push({
            sectionId: frag.section.id,
            polygon: rectToPolygon(bestCol * (colWidthPct + hGapPct), 0, colWidthPct, Math.min(usedPct, 100)),
            columnCount: 1,
            pageIndex: currentPage,
            startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
            endItemIndex: splitResult.splitIndex,
          })
          watermarks[bestCol] = Math.min(usedPct, 100) + vGapPct
          queue.unshift({ section: frag.section, startIdx: splitResult.splitIndex, endIdx: frag.endIdx })
          continue
        }
      }
      // Single item that's too tall or can't split — just place it
      flowLayouts.push({
        sectionId: frag.section.id,
        polygon: rectToPolygon(bestCol * (colWidthPct + hGapPct), 0, colWidthPct, Math.min(heightPct, 100)),
        columnCount: 1,
        pageIndex: currentPage,
        startItemIndex: frag.startIdx > 0 ? frag.startIdx : undefined,
        endItemIndex: frag.endIdx,
      })
      watermarks[bestCol] = Math.min(heightPct, 100) + vGapPct
      continue
    }

    // Case 4: No room in any column on this page — advance to next page
    nextPage()
    queue.unshift(frag) // re-process on fresh page
  }

  return {
    sectionLayouts: flowLayouts,
    pageCount: currentPage + 1,
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
