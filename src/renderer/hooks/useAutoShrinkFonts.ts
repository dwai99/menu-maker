import { useEffect, useRef } from 'react'
import { useLayoutStore } from '@/stores/layout-store'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { PAGE_SIZES } from '@/models/layout'
import { detectOverflow } from '@/layout/overflow'

/**
 * Minimum font size (in pt) that auto-shrink will not go below.
 */
const MIN_FONT_SIZE_PT = 6

/**
 * Fraction by which all font sizes are reduced per shrink pass (10%).
 */
const SHRINK_FACTOR = 0.9

/**
 * Maximum number of shrink passes per overflow event to avoid infinite loops.
 */
const MAX_PASSES = 20

/**
 * Auto-shrink fonts to fit content when `pageLayout.autoShrinkFonts` is enabled
 * and content overflows the page.
 *
 * Strategy:
 * - Runs synchronously in a loop (no DOM involvement — uses the same height
 *   estimator as detectOverflow) so it converges in one effect invocation.
 * - Scales all typography font sizes proportionally by SHRINK_FACTOR per pass
 *   until the content fits or every font hits MIN_FONT_SIZE_PT.
 * - Writes the final typography in a single store update to avoid cascading
 *   re-renders.
 * - The update is made invisible to undo history (via temporal.pause/resume)
 *   so it doesn't pollute the undo stack when auto-shrink fires automatically.
 *   A manual "Shrink fonts" button click in PagePreview still creates an undo
 *   entry as before.
 */
export function useAutoShrinkFonts(): void {
  const menuData = useMenuStore((s) => s.menuData)
  const pageLayout = useLayoutStore((s) => s.pageLayout)
  const overflowState = useUIStore((s) => s.overflowState)
  const markDirty = useUIStore((s) => s.markDirty)

  // Track the typography that triggered the last shrink so we don't re-fire
  // after our own write lands in the store.
  const lastShrunkTypographyRef = useRef<string>('')

  useEffect(() => {
    if (!pageLayout.autoShrinkFonts) return
    if (!overflowState?.isOverflowing) return

    // Fingerprint current typography to detect if we already processed this state
    const typographyFingerprint = JSON.stringify(pageLayout.typography)
    if (typographyFingerprint === lastShrunkTypographyRef.current) return

    // Deep-clone typography so we can mutate freely during simulation
    const typography = JSON.parse(JSON.stringify(pageLayout.typography)) as typeof pageLayout.typography

    let passes = 0
    let stillOverflowing = true

    while (stillOverflowing && passes < MAX_PASSES) {
      // Check whether every font is already at the minimum — if so, give up
      const allAtMin = (Object.keys(typography) as (keyof typeof typography)[]).every(
        (role) => typography[role].fontSize <= MIN_FONT_SIZE_PT
      )
      if (allAtMin) break

      // Shrink all font sizes by SHRINK_FACTOR, floored at MIN_FONT_SIZE_PT
      for (const role of Object.keys(typography) as (keyof typeof typography)[]) {
        typography[role] = {
          ...typography[role],
          fontSize: Math.max(
            MIN_FONT_SIZE_PT,
            Math.round(typography[role].fontSize * SHRINK_FACTOR * 10) / 10,
          ),
        }
      }

      // Simulate overflow with the candidate typography
      const candidate = { ...pageLayout, typography }
      const result = detectOverflow(menuData.sections, candidate, menuData, PAGE_SIZES)
      stillOverflowing = result.isOverflowing
      passes++
    }

    // Only apply if typography actually changed
    if (JSON.stringify(typography) === typographyFingerprint) return

    // Record so we don't re-process after our own write
    lastShrunkTypographyRef.current = JSON.stringify(typography)

    // Write all roles in one undo-invisible batch
    const { temporal } = useLayoutStore
    temporal.getState().pause()
    try {
      const store = useLayoutStore.getState()
      for (const role of Object.keys(typography) as (keyof typeof typography)[]) {
        store.setTypography(role, { fontSize: typography[role].fontSize })
      }
    } finally {
      temporal.getState().resume()
    }

    markDirty()
  }, [
    overflowState,
    pageLayout.autoShrinkFonts,
    // Re-run if typography changes from outside (e.g. user edits a font size)
    pageLayout.typography,
    pageLayout.pageSize,
    pageLayout.orientation,
    pageLayout.margins,
    pageLayout.columnCount,
    menuData,
    markDirty,
  ])
}
