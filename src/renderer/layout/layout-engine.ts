import type { SectionLayout, TypographyConfig, ColumnCount, VariantDisplayMode } from '../models/layout'
import type { MenuSection } from '../models/menu'
import { boundingBox, rectToPolygon } from './polygon'
import { findSplitPoint, estimatePartialSectionHeight, HEIGHT_BUFFER } from './measure'

// ── Fragment Identity ────────────────────────────────────────────────

/**
 * Build a unique fragment ID from a SectionLayout.
 * Format: "sectionId:startItemIndex"
 * This distinguishes multiple layout entries for the same split section.
 */
export function getFragmentId(layout: SectionLayout): string {
  return `${layout.sectionId}:${layout.startItemIndex ?? 0}`
}

/**
 * Parse a fragment ID back into its components.
 */
export function parseFragmentId(fragmentId: string): { sectionId: string; startItemIndex: number } {
  const colonIdx = fragmentId.lastIndexOf(':')
  if (colonIdx === -1) {
    return { sectionId: fragmentId, startItemIndex: 0 }
  }
  const sectionId = fragmentId.substring(0, colonIdx)
  const startItemIndex = parseInt(fragmentId.substring(colonIdx + 1), 10)
  return { sectionId, startItemIndex: isNaN(startItemIndex) ? 0 : startItemIndex }
}

// ── Fragment Lookup ──────────────────────────────────────────────────

/**
 * Find a specific fragment by its fragmentId in an array of SectionLayouts.
 */
export function findFragment(fragmentId: string, layouts: SectionLayout[]): SectionLayout | undefined {
  const { sectionId, startItemIndex } = parseFragmentId(fragmentId)
  return layouts.find(
    (sl) => sl.sectionId === sectionId && (sl.startItemIndex ?? 0) === startItemIndex
  )
}

/**
 * Find the index of a specific fragment by its fragmentId.
 * Returns -1 if not found.
 */
export function findFragmentIndex(fragmentId: string, layouts: SectionLayout[]): number {
  const { sectionId, startItemIndex } = parseFragmentId(fragmentId)
  return layouts.findIndex(
    (sl) => sl.sectionId === sectionId && (sl.startItemIndex ?? 0) === startItemIndex
  )
}

// ── Resize with Auto-Split ───────────────────────────────────────────

export interface ResizeFragmentInput {
  fragmentId: string
  section: MenuSection
  allLayouts: SectionLayout[]
  typography: TypographyConfig
  itemSeparator: string
  contentWidthPx: number
  effectiveHeightPx: number
  variantDisplayMode?: VariantDisplayMode
}

/**
 * Handle resize completion for a fragment — auto-split overflowing items
 * into a continuation fragment, or absorb items back when expanded.
 *
 * Returns a new layouts array (does not mutate the input).
 * Extracted from PagePreview.tsx handleResizeEnd.
 */
export function resizeFragment(input: ResizeFragmentInput): SectionLayout[] {
  const {
    fragmentId,
    section,
    allLayouts: inputLayouts,
    typography,
    itemSeparator,
    contentWidthPx,
    effectiveHeightPx,
    variantDisplayMode,
  } = input

  const { startItemIndex: fragmentStartIndex } = parseFragmentId(fragmentId)

  if ((section.items || []).length === 0) return inputLayouts

  const allLayouts = inputLayouts.map((sl) => ({ ...sl }))

  // Find the specific layout fragment that was resized
  const layoutIdx = findFragmentIndex(fragmentId, allLayouts)
  if (layoutIdx === -1) return inputLayouts
  const layout = allLayouts[layoutIdx]

  // Calculate available height in pixels from the polygon bounding box
  const bboxRect = boundingBox(layout.polygon)
  const availableHeightPx = (bboxRect.height / 100) * effectiveHeightPx

  // Calculate container width for text measurement
  const colWidthPx = (bboxRect.width / 100) * contentWidthPx

  // Find where items split at the new height
  const totalItems = (section.items || []).length
  const splitResult = findSplitPoint(
    section,
    typography,
    colWidthPx,
    availableHeightPx,
    itemSeparator as any,
    fragmentStartIndex,
    variantDisplayMode,
  )

  // Find existing continuation fragments (same sectionId, higher startItemIndex)
  // sorted by startItemIndex ascending
  const continuationIndices: number[] = []
  allLayouts.forEach((sl, idx) => {
    if (sl.sectionId === section.id && (sl.startItemIndex ?? 0) > fragmentStartIndex) {
      continuationIndices.push(idx)
    }
  })
  continuationIndices.sort((a, b) =>
    (allLayouts[a].startItemIndex ?? 0) - (allLayouts[b].startItemIndex ?? 0)
  )

  if (splitResult.splitIndex >= totalItems) {
    // All remaining items fit — remove all continuations and clear endItemIndex
    allLayouts[layoutIdx] = { ...allLayouts[layoutIdx], endItemIndex: undefined }
    for (let i = continuationIndices.length - 1; i >= 0; i--) {
      allLayouts.splice(continuationIndices[i], 1)
    }
  } else {
    // Need to split — update endItemIndex on the resized fragment
    allLayouts[layoutIdx] = { ...allLayouts[layoutIdx], endItemIndex: splitResult.splitIndex }

    // Cascade re-split through existing continuation polygons.
    // Each continuation keeps its polygon position but gets re-assigned
    // the correct item range based on what fits in its box.
    let remainingStart = splitResult.splitIndex
    const toRemove: number[] = []

    for (const contIdx of continuationIndices) {
      if (remainingStart >= totalItems) {
        // No more items — mark this continuation for removal
        toRemove.push(contIdx)
        continue
      }

      const contLayout = allLayouts[contIdx]
      const contBbox = boundingBox(contLayout.polygon)
      const contHeightPx = (contBbox.height / 100) * effectiveHeightPx
      const contWidthPx = (contBbox.width / 100) * contentWidthPx

      // Find how many items fit in this continuation's box
      const contSplit = findSplitPoint(
        section,
        typography,
        contWidthPx,
        contHeightPx,
        itemSeparator as any,
        remainingStart,
        variantDisplayMode,
      )

      if (contSplit.splitIndex >= totalItems) {
        // All remaining items fit in this continuation
        allLayouts[contIdx] = {
          ...contLayout,
          startItemIndex: remainingStart,
          endItemIndex: undefined,
        }
        remainingStart = totalItems
      } else {
        allLayouts[contIdx] = {
          ...contLayout,
          startItemIndex: remainingStart,
          endItemIndex: contSplit.splitIndex,
        }
        remainingStart = contSplit.splitIndex
      }
    }

    // Remove empty continuations in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      allLayouts.splice(toRemove[i], 1)
    }

    // If there are still remaining items after all continuations, create a new one
    if (remainingStart < totalItems) {
      const lastCont = continuationIndices.length > 0
        ? allLayouts[continuationIndices[continuationIndices.length - 1]]
        : layout
      const lastBbox = boundingBox(lastCont?.polygon ?? layout.polygon)
      const gap = 2
      const remHeightPx = estimatePartialSectionHeight(
        section, typography, colWidthPx, itemSeparator as any,
        remainingStart, undefined, variantDisplayMode,
      )
      const remHeightPct = Math.min(
        (remHeightPx * HEIGHT_BUFFER / effectiveHeightPx) * 100, 100,
      )
      const contY = lastBbox.y + lastBbox.height + gap

      // If the continuation would overflow the current page, put it on a new page
      if (contY > 95) {
        const currentPageIndex = lastCont?.pageIndex ?? layout.pageIndex
        allLayouts.push({
          sectionId: section.id,
          polygon: rectToPolygon(lastBbox.x, 0, lastBbox.width, Math.max(Math.min(remHeightPct, 100), 5)),
          columnCount: layout.columnCount,
          pageIndex: currentPageIndex + 1,
          startItemIndex: remainingStart,
        })
      } else {
        const contHeight = Math.min(remHeightPct, 100 - contY)
        allLayouts.push({
          sectionId: section.id,
          polygon: rectToPolygon(lastBbox.x, contY, lastBbox.width, Math.max(contHeight, 5)),
          columnCount: layout.columnCount,
          pageIndex: layout.pageIndex,
          startItemIndex: remainingStart,
        })
      }
    }

  }

  return reflowColumn(fragmentId, allLayouts)
}

// ── Column Reflow ────────────────────────────────────────────────────

/** Tolerance in percentage points for considering two fragments in the same column */
const COL_TOLERANCE = 2

/**
 * After a fragment is resized, reflow its sibling fragments (same section)
 * in the same column so split continuations stack without overlaps or gaps.
 *
 * Only operates on fragments of the same section that share the same column
 * (overlapping x range within tolerance, same pageIndex).
 * Does NOT move unrelated sections — this preserves freeform positioning.
 */
export function reflowColumn(
  resizedFragmentId: string,
  layouts: SectionLayout[],
): SectionLayout[] {
  const resizedIdx = findFragmentIndex(resizedFragmentId, layouts)
  if (resizedIdx === -1) return layouts

  const resized = layouts[resizedIdx]
  const resizedBbox = boundingBox(resized.polygon)

  // Find sibling fragments: same sectionId, overlapping x range, same page
  const columnIndices: number[] = []
  for (let i = 0; i < layouts.length; i++) {
    const sl = layouts[i]
    if (sl.sectionId !== resized.sectionId) continue
    if (sl.pageIndex !== resized.pageIndex) continue
    const bbox = boundingBox(sl.polygon)
    // Check x overlap: fragments are in the same column if their x ranges overlap
    const overlapLeft = Math.max(resizedBbox.x, bbox.x)
    const overlapRight = Math.min(resizedBbox.x + resizedBbox.width, bbox.x + bbox.width)
    if (overlapRight - overlapLeft > -COL_TOLERANCE) {
      columnIndices.push(i)
    }
  }

  if (columnIndices.length <= 1) return layouts

  // Sort column fragments by y position
  columnIndices.sort((a, b) => {
    const ay = boundingBox(layouts[a].polygon).y
    const by = boundingBox(layouts[b].polygon).y
    return ay - by
  })

  // Restack: each fragment starts where the previous one ended + gap
  const GAP_PCT = 1 // 1% gap between stacked fragments
  const result = layouts.map((sl) => ({ ...sl }))

  let nextY = boundingBox(result[columnIndices[0]].polygon).y

  for (const idx of columnIndices) {
    const bbox = boundingBox(result[idx].polygon)
    if (bbox.y !== nextY) {
      // Shift this fragment to the correct y position, keeping its height and x
      result[idx] = {
        ...result[idx],
        polygon: rectToPolygon(bbox.x, nextY, bbox.width, bbox.height),
      }
    }
    const updatedBbox = boundingBox(result[idx].polygon)
    nextY = updatedBbox.y + updatedBbox.height + GAP_PCT
  }

  return result
}

// ── Fragment Management ──────────────────────────────────────────────

/**
 * Remove a specific fragment from the layouts array.
 * Only removes the fragment matching the fragmentId (not all fragments
 * with the same sectionId).
 */
export function removeFragment(fragmentId: string, layouts: SectionLayout[]): SectionLayout[] {
  const { sectionId, startItemIndex } = parseFragmentId(fragmentId)
  return layouts.filter(
    (sl) => !(sl.sectionId === sectionId && (sl.startItemIndex ?? 0) === startItemIndex)
  )
}

/**
 * Merge all fragments of a section back into a single layout entry.
 * Keeps the first fragment's polygon and removes startItemIndex/endItemIndex.
 */
export function mergeFragments(sectionId: string, layouts: SectionLayout[]): SectionLayout[] {
  const fragments = layouts.filter((sl) => sl.sectionId === sectionId)
  const others = layouts.filter((sl) => sl.sectionId !== sectionId)

  if (fragments.length <= 1) return layouts

  // Sort by startItemIndex to find the first fragment
  const sorted = [...fragments].sort((a, b) => (a.startItemIndex ?? 0) - (b.startItemIndex ?? 0))
  const merged: SectionLayout = {
    ...sorted[0],
    startItemIndex: undefined,
    endItemIndex: undefined,
  }

  // Reconstruct preserving order: replace first occurrence, remove the rest
  const result: SectionLayout[] = []
  let placed = false
  for (const sl of layouts) {
    if (sl.sectionId === sectionId) {
      if (!placed) {
        result.push(merged)
        placed = true
      }
      // Skip other fragments
    } else {
      result.push(sl)
    }
  }

  return result
}
