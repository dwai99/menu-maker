import { useLayoutEffect, useRef } from 'react'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import type { SectionLayout } from '@/models/layout'
import { boundingBox } from '@/layout/polygon'

/**
 * Input configuration for the layout commit hook
 */
export interface UseLayoutCommitInput {
  /** Refs keyed by fragment ID (format: "sectionId:startItemIndex") */
  sectionRefs: Map<string, HTMLDivElement | null>
  /** Current section layouts from the layout store */
  sectionLayouts: SectionLayout[]
  /** Available height for sections in pixels (content area minus header/footer) */
  contentHeightPx: number
  /** Current zoom level */
  zoom: number
}

/**
 * Vertical gap between restacked sections (as percentage of content height)
 */
const VERTICAL_GAP_PCT = 1.0

/**
 * Minimum height difference (in pixels) to trigger a shrink correction
 */
const CORRECTION_THRESHOLD_PX = 2

/**
 * Additional padding to add to measured heights (in pixels) for safety
 */
const HEIGHT_PADDING_PX = 4

/**
 * Generate a unique fragment ID for a section layout
 */
function getFragmentId(layout: SectionLayout): string {
  const startIdx = layout.startItemIndex ?? 0
  return `${layout.sectionId}:${startIdx}`
}

interface GroupedFragment {
  fragmentId: string
  layout: SectionLayout
  layoutIndex: number
  measuredHeightPx: number
  originalYPct: number
  originalHeightPct: number
}

interface FragmentGroup {
  pageIndex: number
  columnX: number
  fragments: GroupedFragment[]
}

/**
 * Group fragments by page index and column, then sort by Y position
 */
function groupFragmentsByPageAndColumn(
  sectionLayouts: SectionLayout[],
  sectionRefs: Map<string, HTMLDivElement | null>,
  zoom: number
): FragmentGroup[] {
  const groups = new Map<string, FragmentGroup>()

  for (let i = 0; i < sectionLayouts.length; i++) {
    const layout = sectionLayouts[i]
    const fragmentId = getFragmentId(layout)
    const ref = sectionRefs.get(fragmentId)
    if (!ref) continue

    const bbox = boundingBox(layout.polygon)
    const measuredHeightPx = ref.scrollHeight / zoom
    const columnX = Math.round(bbox.x * 10) / 10

    const groupKey = `${layout.pageIndex}:${columnX}`

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        pageIndex: layout.pageIndex,
        columnX,
        fragments: [],
      })
    }

    groups.get(groupKey)!.fragments.push({
      fragmentId,
      layout,
      layoutIndex: i,
      measuredHeightPx,
      originalYPct: bbox.y,
      originalHeightPct: bbox.height,
    })
  }

  // Sort fragments within each group by original Y position
  for (const group of groups.values()) {
    group.fragments.sort((a, b) => a.originalYPct - b.originalYPct)
  }

  return Array.from(groups.values())
}

/**
 * Compute corrected section layouts. For each column group:
 * - Shrink sections whose content is shorter than the polygon (shrink-only)
 * - Restack sections from top to bottom with vertical gap
 * Returns the full corrected sectionLayouts array, or null if no changes needed.
 */
function computeCorrectedLayouts(
  sectionLayouts: SectionLayout[],
  sectionRefs: Map<string, HTMLDivElement | null>,
  contentHeightPx: number,
  zoom: number
): SectionLayout[] | null {
  const groups = groupFragmentsByPageAndColumn(sectionLayouts, sectionRefs, zoom)

  // Build a map of layoutIndex → corrected polygon
  const corrections = new Map<number, [number, number][]>()

  for (const group of groups) {
    let currentYPct = 0

    for (const fragment of group.fragments) {
      const { layout, layoutIndex, measuredHeightPx, originalHeightPct } = fragment
      const bbox = boundingBox(layout.polygon)
      const allocatedHeightPx = (originalHeightPct / 100) * contentHeightPx

      // Only SHRINK sections to fit content — never grow beyond the allocated polygon.
      let correctedHeightPct: number
      if (measuredHeightPx + CORRECTION_THRESHOLD_PX < allocatedHeightPx) {
        correctedHeightPct = ((measuredHeightPx + HEIGHT_PADDING_PX) / contentHeightPx) * 100
      } else {
        correctedHeightPct = originalHeightPct
      }

      // Build corrected polygon with new Y and height
      const cx = bbox.x
      const cw = bbox.width
      const newPolygon: [number, number][] = [
        [cx, currentYPct],
        [cx + cw, currentYPct],
        [cx + cw, currentYPct + correctedHeightPct],
        [cx, currentYPct + correctedHeightPct],
      ]

      // Only record correction if position or height actually changed
      if (
        Math.abs(currentYPct - bbox.y) > 0.1 ||
        Math.abs(correctedHeightPct - originalHeightPct) > 0.1
      ) {
        corrections.set(layoutIndex, newPolygon)
      }

      currentYPct += correctedHeightPct + VERTICAL_GAP_PCT
    }
  }

  if (corrections.size === 0) return null

  // Build corrected layouts array
  return sectionLayouts.map((layout, i) => {
    const corrected = corrections.get(i)
    if (corrected) {
      return { ...layout, polygon: corrected }
    }
    return layout
  })
}

/**
 * One-shot layout commit hook.
 *
 * After auto-layout estimates section positions, this hook runs in
 * useLayoutEffect, measures actual DOM heights, and writes corrected
 * polygon data back to the store. This eliminates render-time overrides
 * and ensures polygon data is the single source of truth.
 *
 * Only runs when `pendingLayoutCommit` flag is true (set by auto-layout
 * call sites). Uses temporal.pause()/resume() to make the correction
 * invisible to undo history.
 */
export function useLayoutCommit(input: UseLayoutCommitInput): void {
  const { sectionRefs, sectionLayouts, contentHeightPx, zoom } = input

  const pendingCommit = useUIStore((s) => s.pendingLayoutCommit)
  const setPendingLayoutCommit = useUIStore((s) => s.setPendingLayoutCommit)

  // Guard against infinite loops: track the commit we just performed
  const lastCommitRef = useRef<string>('')

  useLayoutEffect(() => {
    if (!pendingCommit) return
    if (contentHeightPx <= 0) return
    if (sectionLayouts.length === 0) return

    // Build a fingerprint of current state to detect if we already committed this
    const fingerprint = sectionLayouts
      .map((sl) => {
        const bbox = boundingBox(sl.polygon)
        return `${sl.sectionId}:${bbox.y.toFixed(1)}:${bbox.height.toFixed(1)}`
      })
      .join('|')

    if (fingerprint === lastCommitRef.current) {
      // Already committed this exact layout — just clear the flag
      setPendingLayoutCommit(false)
      return
    }

    // Wait for all refs to be populated
    const allRefsReady = sectionLayouts.every((layout) => {
      const fragmentId = getFragmentId(layout)
      return sectionRefs.has(fragmentId) && sectionRefs.get(fragmentId) !== null
    })

    if (!allRefsReady) return

    const corrected = computeCorrectedLayouts(
      sectionLayouts,
      sectionRefs,
      contentHeightPx,
      zoom
    )

    if (corrected) {
      // Write corrections back to the store, invisible to undo
      const temporal = useLayoutStore.temporal.getState()
      temporal.pause()
      useLayoutStore.getState().setSectionLayouts(corrected)
      temporal.resume()

      // Update fingerprint with the corrected layout
      lastCommitRef.current = corrected
        .map((sl) => {
          const bbox = boundingBox(sl.polygon)
          return `${sl.sectionId}:${bbox.y.toFixed(1)}:${bbox.height.toFixed(1)}`
        })
        .join('|')
    } else {
      // No corrections needed — record current fingerprint
      lastCommitRef.current = fingerprint
    }

    // Clear the pending flag
    setPendingLayoutCommit(false)
  }, [pendingCommit, sectionLayouts, sectionRefs, contentHeightPx, zoom, setPendingLayoutCommit])
}
