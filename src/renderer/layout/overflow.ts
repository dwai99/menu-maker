import type { PageLayout } from '../models/layout'
import { PAGE_SIZES } from '../models/layout'
import type { MenuData, MenuSection } from '../models/menu'
import {
  estimateHeaderHeight,
  estimateFooterHeight,
  estimateSectionHeight,
  estimatePartialSectionHeight,
  findSplitPoint,
  HEIGHT_BUFFER,
} from './measure'

export interface OverflowState {
  isOverflowing: boolean
  totalContentHeight: number
  availableHeight: number
  overflowAmount: number
  overflowPercent: number
  pageCount: number
}

const DPI = 96

/**
 * Detect whether the current menu content overflows the page.
 * Simulates the column-grid masonry layout with section splitting.
 */
export function detectOverflow(
  sections: MenuSection[],
  pageLayout: PageLayout,
  menuData: MenuData,
  pageSizes: typeof PAGE_SIZES,
): OverflowState {
  const pageDims = pageSizes[pageLayout.pageSize]
  const pageWidthInches = pageLayout.orientation === 'portrait' ? pageDims.width : pageDims.height
  const pageHeightInches = pageLayout.orientation === 'portrait' ? pageDims.height : pageDims.width

  const contentWidthPx = (pageWidthInches - pageLayout.margins.left - pageLayout.margins.right) * DPI
  const contentHeightPx = (pageHeightInches - pageLayout.margins.top - pageLayout.margins.bottom) * DPI

  const headerHeight = estimateHeaderHeight(menuData, pageLayout.typography)
  const footerHeight = estimateFooterHeight(menuData.footer, pageLayout.typography)
  const availableHeightPx = contentHeightPx - headerHeight - footerHeight

  const gridCols = Math.max(1, pageLayout.columnCount || 1)
  const hGapPx = gridCols > 1 ? 16 : 0
  const colWidthPx = (contentWidthPx - (gridCols - 1) * hGapPx) / gridCols
  const vGapPx = 8

  // Build fragments with splitting (mirrors treemap algorithm)
  interface Frag { section: MenuSection; startIdx: number; endIdx?: number; h: number }

  const frags: Frag[] = sections.map((section) => {
    const result = estimateSectionHeight(section, pageLayout.typography, colWidthPx, 1, pageLayout.itemSeparator, pageLayout.variantDisplayMode, pageLayout.sectionTitleDecoration)
    return { section, startIdx: 0, h: (result.estimatedHeight + 4) * HEIGHT_BUFFER }
  })
  frags.sort((a, b) => b.h - a.h)

  const watermarks = new Array(gridCols).fill(0)
  const queue = [...frags]

  while (queue.length > 0) {
    const frag = queue.shift()!
    let bestCol = 0
    for (let c = 1; c < gridCols; c++) {
      if (watermarks[c] < watermarks[bestCol]) bestCol = c
    }

    const remainingPx = availableHeightPx - watermarks[bestCol]
    const itemCount = (frag.section.items || []).length
    const fragEnd = frag.endIdx ?? itemCount

    if (frag.h <= remainingPx) {
      watermarks[bestCol] += frag.h + vGapPx
    } else if ((fragEnd - frag.startIdx) > 1) {
      // Try splitting
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
        watermarks[bestCol] += splitResult.usedHeight * HEIGHT_BUFFER + vGapPx
        const remH = estimatePartialSectionHeight(
          frag.section,
          pageLayout.typography,
          colWidthPx,
          pageLayout.itemSeparator,
          splitResult.splitIndex,
          frag.endIdx,
          pageLayout.variantDisplayMode,
        )
        queue.push({ section: frag.section, startIdx: splitResult.splitIndex, endIdx: frag.endIdx, h: (remH + 4) * HEIGHT_BUFFER })
        queue.sort((a, b) => b.h - a.h)
      } else {
        watermarks[bestCol] += frag.h + vGapPx
      }
    } else {
      watermarks[bestCol] += frag.h + vGapPx
    }
  }

  const tallestColumn = Math.max(...watermarks)
  const overflowAmount = Math.max(0, tallestColumn - availableHeightPx)
  const overflowPercent = availableHeightPx > 0
    ? Math.round((overflowAmount / availableHeightPx) * 100)
    : 0

  return {
    isOverflowing: tallestColumn > availableHeightPx,
    totalContentHeight: headerHeight + tallestColumn + footerHeight,
    availableHeight: contentHeightPx,
    overflowAmount,
    overflowPercent,
    pageCount: Math.max(1, Math.ceil(tallestColumn / availableHeightPx)),
  }
}
