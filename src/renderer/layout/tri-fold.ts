/**
 * Tri-fold layout engine.
 *
 * A tri-fold brochure uses letter or legal paper printed landscape with
 * 3 panels per side (6 total). The inner-right panel (the flap that folds
 * in) is slightly narrower (~1/16" less) to allow for fold clearance.
 *
 * Front side (page 0), panels left→right:
 *   back | inner-flap | cover
 *
 * Back side (page 1), panels left→right:
 *   inside-left | inside-center | inside-right
 */

import type { TriFoldPanelRole, TriFoldPaperSize, TriFoldConfig, TriFoldType, PageLayout, SectionLayout, TypographyConfig } from '@/models/layout'
import { PAGE_SIZES } from '@/models/layout'
import { TRI_FOLD_FRONT_PANELS, TRI_FOLD_BACK_PANELS } from '@/models/layout'
import type { MenuSection, MenuData } from '@/models/menu'
import { rectToPolygon } from './polygon'
import { estimateSectionHeight, findSplitPoint, HEIGHT_BUFFER } from './measure'
import type { AutoLayoutResult } from './auto-layout'

export interface TriFoldPanelGeometry {
  role: TriFoldPanelRole
  pageIndex: number       // 0 = front, 1 = back
  /** Panel bounds in inches relative to the full paper */
  x: number
  y: number
  width: number
  height: number
}

/**
 * Compute the geometry of all 6 panels given a paper size.
 * Returns widths/heights in inches.
 */
export function computeTriFoldPanelGeometry(paperSize: TriFoldPaperSize): TriFoldPanelGeometry[] {
  const dims = PAGE_SIZES[paperSize]
  // Landscape: width is the larger dimension
  const paperWidth = Math.max(dims.width, dims.height)
  const paperHeight = Math.min(dims.width, dims.height)

  // Inner flap is 1/16" narrower for fold clearance
  const foldClearance = 1 / 16
  const flapWidth = (paperWidth / 3) - foldClearance
  const normalWidth = (paperWidth - flapWidth) / 2

  const panels: TriFoldPanelGeometry[] = []

  // Front side panels (left to right): back, inner-flap, cover
  const frontWidths = [normalWidth, flapWidth, normalWidth]
  let x = 0
  for (let i = 0; i < 3; i++) {
    panels.push({
      role: TRI_FOLD_FRONT_PANELS[i],
      pageIndex: 0,
      x,
      y: 0,
      width: frontWidths[i],
      height: paperHeight,
    })
    x += frontWidths[i]
  }

  // Back side panels (left to right): inside-left, inside-center, inside-right
  const backWidths = [normalWidth, normalWidth, flapWidth]
  x = 0
  for (let i = 0; i < 3; i++) {
    panels.push({
      role: TRI_FOLD_BACK_PANELS[i],
      pageIndex: 1,
      x,
      y: 0,
      width: backWidths[i],
      height: paperHeight,
    })
    x += backWidths[i]
  }

  return panels
}

/**
 * Auto-distribute sections for tri-fold layout.
 *
 * When sections and pageLayout are provided, estimates section heights and
 * distributes them across inside panels using a balanced greedy algorithm
 * so each panel gets roughly equal content. This reduces unnecessary splits
 * from the overflow engine.
 *
 * Fallback (no sections/pageLayout): all in inside-left for sequential flow.
 *
 * Cover is reserved for title/logo (no menu sections).
 */
export function autoDistributeTriFold(
  sectionIds: string[],
  sections?: MenuSection[],
  pageLayout?: PageLayout,
): TriFoldConfig['panelSections'] {
  const empty: TriFoldConfig['panelSections'] = {
    'cover': [],
    'back': [],
    'inner-flap': [],
    'inside-left': [],
    'inside-center': [],
    'inside-right': [],
  }

  if (sectionIds.length === 0) return empty

  // Fallback: no height info available, dump everything in inside-left
  if (!sections || !pageLayout || !pageLayout.triFold?.enabled) {
    return { ...empty, 'inside-left': [...sectionIds] }
  }

  const triFold = pageLayout.triFold
  const paperSize = triFold.paperSize
  const foldType = triFold.foldType ?? 'letter-fold'

  // Compute panel content widths
  const [fold1Pct, fold2Pct] = getTriFoldFoldLinesByType(paperSize, foldType)
  const dims = PAGE_SIZES[paperSize]
  const paperWidthInches = Math.max(dims.width, dims.height)
  const paperHeightInches = Math.min(dims.width, dims.height)
  const marginLeft = pageLayout.margins.left
  const marginRight = pageLayout.margins.right
  const marginTop = pageLayout.margins.top
  const marginBottom = pageLayout.margins.bottom
  const contentWidthInches = paperWidthInches - marginLeft - marginRight
  const contentHeightInches = paperHeightInches - marginTop - marginBottom
  const contentWidthPx = contentWidthInches * DPI
  const contentHeightPx = contentHeightInches * DPI

  // Convert fold lines to content-area percentages
  const foldLine1ContentPct = ((fold1Pct / 100 * paperWidthInches - marginLeft) / contentWidthInches) * 100
  const foldLine2ContentPct = ((fold2Pct / 100 * paperWidthInches - marginLeft) / contentWidthInches) * 100

  // Panel widths as % of content area
  const panelWidthPcts = [
    foldLine1ContentPct,                  // inside-left
    foldLine2ContentPct - foldLine1ContentPct, // inside-center
    100 - foldLine2ContentPct,            // inside-right
  ]
  const vPadPx = (V_PAD_PCT / 100) * contentHeightPx
  const availablePanelHeight = contentHeightPx - vPadPx * 2

  // Estimate each section's height using the average panel width
  const sectionMap = new Map(sections.map((s) => [s.id, s]))
  const avgPanelWidthPx = panelWidthPcts.reduce((a, b) => a + b, 0) / 3 / 100 * contentWidthPx
  const innerPanelWidthPx = ((avgPanelWidthPx / contentWidthPx * 100 - H_PAD_PCT * 2) / 100) * contentWidthPx

  const sectionHeights: { id: string; height: number }[] = []
  let totalHeight = 0
  for (const id of sectionIds) {
    const section = sectionMap.get(id)
    if (!section) continue
    const result = estimateSectionHeight(
      section,
      pageLayout.typography,
      innerPanelWidthPx,
      1,
      pageLayout.itemSeparator,
      pageLayout.variantDisplayMode,
      pageLayout.sectionTitleDecoration,
    )
    const h = (result.estimatedHeight + 4) * HEIGHT_BUFFER
    sectionHeights.push({ id, height: h })
    totalHeight += h
  }

  // Determine how many content panels to use: start with 3 inside panels,
  // expand to 5 (add inner-flap, back) if content overflows
  const contentPanels: TriFoldPanelRole[] = totalHeight > availablePanelHeight * 3
    ? ['inside-left', 'inside-center', 'inside-right', 'inner-flap', 'back']
    : ['inside-left', 'inside-center', 'inside-right']

  const numPanels = contentPanels.length
  const targetHeight = totalHeight / numPanels

  // Greedy sequential assignment: walk sections in order, advance to next
  // panel when adding a section would exceed the target (but always assign
  // at least one section per panel before advancing).
  const panelAssignments = new Map<TriFoldPanelRole, string[]>()
  for (const role of contentPanels) panelAssignments.set(role, [])

  let panelIdx = 0
  let currentPanelHeight = 0

  for (const { id, height } of sectionHeights) {
    const currentPanel = contentPanels[panelIdx]
    const currentAssignment = panelAssignments.get(currentPanel)!

    // Advance to next panel if: this panel has at least one section AND
    // adding this section would exceed the target AND more panels remain
    if (
      currentAssignment.length > 0 &&
      currentPanelHeight + height > targetHeight &&
      panelIdx < numPanels - 1
    ) {
      panelIdx++
      currentPanelHeight = 0
    }

    const targetPanel = contentPanels[panelIdx]
    panelAssignments.get(targetPanel)!.push(id)
    currentPanelHeight += height
  }

  // Build result with all 6 panel roles
  const result: TriFoldConfig['panelSections'] = { ...empty }
  for (const [role, ids] of panelAssignments) {
    result[role] = ids
  }
  return result
}

/**
 * Get the fold line positions as percentages of the total paper width.
 * Returns [firstFold%, secondFold%].
 */
export function getTriFoldFoldLines(paperSize: TriFoldPaperSize): [number, number] {
  const dims = PAGE_SIZES[paperSize]
  const paperWidth = Math.max(dims.width, dims.height)
  const foldClearance = 1 / 16
  const flapWidth = (paperWidth / 3) - foldClearance
  const normalWidth = (paperWidth - flapWidth) / 2

  // Front: inner-flap(normalWidth) | back(flapWidth) | cover(normalWidth)
  const fold1 = (normalWidth / paperWidth) * 100
  const fold2 = ((normalWidth + flapWidth) / paperWidth) * 100

  return [fold1, fold2]
}

/**
 * Get fold line positions for a given fold type.
 * Returns [firstFold%, secondFold%].
 *
 * - letter-fold: inner flap is ~1/16" narrower
 * - z-fold: all panels exactly equal width (1/3 each)
 * - gate-fold: center panel is ~45%, outer panels ~27.5% each
 */
export function getTriFoldFoldLinesByType(
  paperSize: TriFoldPaperSize,
  foldType: TriFoldType = 'letter-fold',
): [number, number] {
  if (foldType === 'z-fold') {
    // Equal thirds
    return [33.333, 66.667]
  }
  if (foldType === 'gate-fold') {
    // Outer panels ~27.5%, center ~45%
    return [27.5, 72.5]
  }
  // Default: letter-fold (same as legacy)
  return getTriFoldFoldLines(paperSize)
}

/**
 * Get the border style for fold lines based on fold type.
 * letter-fold: simple dashes
 * z-fold: alternating mountain/valley (different dash patterns per line)
 * gate-fold: dashed (same as letter-fold but at different positions)
 */
export function getTriFoldLineStyle(foldType: TriFoldType = 'letter-fold', lineIndex: 0 | 1): string {
  if (foldType === 'z-fold') {
    // Mountain fold (solid) vs valley fold (longer dash)
    return lineIndex === 0
      ? '1.5px solid rgba(0,0,0,0.25)'
      : '1.5px dashed rgba(0,0,0,0.25)'
  }
  return '1.5px dashed rgba(0,0,0,0.2)'
}

const DPI = 96

/** Internal padding to keep content away from fold lines and edges */
const H_PAD_PCT = 2    // horizontal padding within panel (%)
const V_PAD_PCT = 1.5  // vertical padding within panel (%)

/**
 * Safety factor for "fits in panel" decisions. Narrow tri-fold panels cause
 * more text wrapping than estimateSectionHeight accounts for. This multiplier
 * ensures sections flow to the next panel rather than overflowing visually.
 * Reduced from 1.25 to 1.12 — the higher value was too conservative and
 * caused sections to be split unnecessarily when they could actually fit.
 */
const TRI_FOLD_SAFETY = 1.12

/**
 * Sequential flow order: content fills inside panels left-to-right,
 * then overflows to front panels. Cover excluded (title/logo).
 */
const PANEL_OVERFLOW_ORDER: TriFoldPanelRole[] = [
  'inside-left', 'inside-center', 'inside-right',
  'inner-flap', 'back',
]


interface PanelInfo {
  role: TriFoldPanelRole
  pageIndex: number
  innerLeftPct: number
  innerWidthPct: number
  availableHeightPx: number
  contentWidthPx: number
}

/** A section fragment queued for placement in a panel */
interface SectionFragment {
  sectionId: string
  startItemIndex: number
}

/**
 * Compute tri-fold layout using sequential column flow.
 *
 * Content flows across panels like newspaper columns: fills one panel
 * top-to-bottom, then continues in the next. Sections split at panel
 * boundaries via findSplitPoint(). When all panels overflow, fonts
 * shrink (min 0.75x for print readability).
 */
export function computeTriFoldLayout(input: {
  sections: MenuSection[]
  pageLayout: PageLayout
  menuData: MenuData
}): AutoLayoutResult {
  const { sections, pageLayout, menuData } = input
  const triFold = pageLayout.triFold

  if (!triFold?.enabled) {
    return { sectionLayouts: [], pageCount: 1, columnCount: 1, fontScale: 1.0 }
  }

  const paperSize = triFold.paperSize
  const foldType = triFold.foldType ?? 'letter-fold'
  const panelSections = triFold.panelSections

  // Get fold lines as % of paper width
  const [fold1Pct, fold2Pct] = getTriFoldFoldLinesByType(paperSize, foldType)

  // Paper dimensions (landscape for tri-fold)
  const dims = PAGE_SIZES[paperSize]
  const paperWidthInches = Math.max(dims.width, dims.height)
  const paperHeightInches = Math.min(dims.width, dims.height)
  const marginLeft = pageLayout.margins.left
  const marginRight = pageLayout.margins.right
  const marginTop = pageLayout.margins.top
  const marginBottom = pageLayout.margins.bottom
  const contentWidthInches = paperWidthInches - marginLeft - marginRight
  const contentHeightInches = paperHeightInches - marginTop - marginBottom
  const contentWidthPx = contentWidthInches * DPI
  const contentHeightPx = contentHeightInches * DPI

  // Convert fold lines from paper-% to content-area-%
  const foldLine1ContentPct = ((fold1Pct / 100 * paperWidthInches - marginLeft) / contentWidthInches) * 100
  const foldLine2ContentPct = ((fold2Pct / 100 * paperWidthInches - marginLeft) / contentWidthInches) * 100

  // Build panel bounds as [leftPct, rightPct] in content-area coordinates
  const panelBounds: Record<TriFoldPanelRole, { left: number; right: number; pageIndex: number }> = {
    'inner-flap':     { left: 0, right: foldLine1ContentPct, pageIndex: 0 },
    'back':           { left: foldLine1ContentPct, right: foldLine2ContentPct, pageIndex: 0 },
    'cover':          { left: foldLine2ContentPct, right: 100, pageIndex: 0 },
    'inside-left':    { left: 0, right: foldLine1ContentPct, pageIndex: 1 },
    'inside-center':  { left: foldLine1ContentPct, right: foldLine2ContentPct, pageIndex: 1 },
    'inside-right':   { left: foldLine2ContentPct, right: 100, pageIndex: 1 },
  }

  // Build panel info for all panels in overflow order
  const vPadPx = (V_PAD_PCT / 100) * contentHeightPx
  const panels: PanelInfo[] = PANEL_OVERFLOW_ORDER.map((role) => {
    const bounds = panelBounds[role]
    const panelWidthPct = bounds.right - bounds.left
    const panelContentWidthPx = ((panelWidthPct - H_PAD_PCT * 2) / 100) * contentWidthPx
    return {
      role,
      pageIndex: bounds.pageIndex,
      innerLeftPct: bounds.left + H_PAD_PCT,
      innerWidthPct: panelWidthPct - H_PAD_PCT * 2,
      availableHeightPx: contentHeightPx - vPadPx * 2,
      contentWidthPx: panelContentWidthPx,
    }
  })

  const sectionMap = new Map(sections.map((s) => [s.id, s]))

  // Build ordered queue of section fragments per panel
  // Use overflow order so we can push overflow to the next panel
  const panelQueues = new Map<TriFoldPanelRole, SectionFragment[]>()
  for (const role of PANEL_OVERFLOW_ORDER) {
    const sectionIds = panelSections[role] ?? []
    panelQueues.set(role, sectionIds.map((id) => ({ sectionId: id, startItemIndex: 0 })))
  }

  // Flow layout: run at scale 1.0 and let content fill all panels sequentially.
  // No automatic font scaling — it fights the flow by cramming content into
  // fewer panels. Users can manually adjust font sizes if needed.
  const result = layoutAtScale(
    panels, panelQueues, sectionMap, pageLayout.typography,
    pageLayout, contentHeightPx, contentWidthPx,
  )

  return {
    sectionLayouts: result.layouts,
    pageCount: 2,
    columnCount: 1,
    fontScale: 1.0,
    overflow: result.overflow,
  }
}

/**
 * Attempt layout at a given typography scale using sequential flow.
 *
 * Sections flow across panels like newspaper columns: content fills one panel
 * top-to-bottom, then continues in the next. Large sections split at panel
 * boundaries. Returns placed section layouts and whether any content overflowed.
 */
function layoutAtScale(
  panels: PanelInfo[],
  originalQueues: Map<TriFoldPanelRole, SectionFragment[]>,
  sectionMap: Map<string, MenuSection>,
  typography: TypographyConfig,
  pageLayout: PageLayout,
  contentHeightPx: number,
  contentWidthPx: number,
): { layouts: SectionLayout[]; overflow: boolean } {
  const layouts: SectionLayout[] = []
  let overflow = false
  const overflowFragments: SectionFragment[] = []

  // Deep-copy queues so we can mutate them (push overflow fragments)
  const queues = new Map<TriFoldPanelRole, SectionFragment[]>()
  for (const [role, frags] of originalQueues) {
    queues.set(role, frags.map((f) => ({ ...f })))
  }

  /** Push fragments to the next panel in the flow order */
  const flowToNextPanel = (items: SectionFragment[], afterPanelIdx: number) => {
    const nextIdx = afterPanelIdx + 1
    if (nextIdx < panels.length) {
      const nextRole = panels[nextIdx].role
      const nextQueue = queues.get(nextRole)!
      // Prepend: flowed items come before any already-assigned items
      nextQueue.unshift(...items)
    } else {
      overflow = true
      overflowFragments.push(...items)
    }
  }

  for (let panelIdx = 0; panelIdx < panels.length; panelIdx++) {
    const panel = panels[panelIdx]
    const queue = queues.get(panel.role) ?? []
    let yPx = 0

    while (queue.length > 0) {
      // If panel is full, flow everything remaining to the next panel
      if (yPx >= panel.availableHeightPx) {
        flowToNextPanel([queue.shift()!, ...queue.splice(0)], panelIdx)
        break
      }

      const frag = queue.shift()!
      const section = sectionMap.get(frag.sectionId)
      if (!section) continue

      const items = (section.items || []).filter((item: any) => item.isAvailable !== false)

      // Skip empty fragments (all items already placed by a prior split)
      if (frag.startItemIndex >= items.length) continue

      // Estimate this fragment's height
      const result = estimateSectionHeight(
        frag.startItemIndex === 0 ? section : { ...section, items: items.slice(frag.startItemIndex) },
        typography,
        panel.contentWidthPx,
        1,
        pageLayout.itemSeparator,
        pageLayout.variantDisplayMode,
        pageLayout.sectionTitleDecoration,
      )
      const fragmentHeightPx = (result.estimatedHeight + 4) * HEIGHT_BUFFER
      const remainingPx = panel.availableHeightPx - yPx
      // Use conservative estimate for "fits" decision — narrow tri-fold panels
      // cause more text wrapping than the estimator accounts for. The safety
      // factor ensures sections flow to the next panel rather than overflowing
      // their panel bounds visually.
      const fitsInPanel = fragmentHeightPx * TRI_FOLD_SAFETY <= remainingPx

      if (fitsInPanel || items.length <= 1 || frag.startItemIndex >= items.length - 1) {
        // Fits (or can't split further) — place it
        const yPct = V_PAD_PCT + (yPx / contentHeightPx) * 100
        const heightPct = (fragmentHeightPx / contentHeightPx) * 100

        const layout: SectionLayout = {
          sectionId: frag.sectionId,
          polygon: rectToPolygon(panel.innerLeftPct, yPct, panel.innerWidthPct, heightPct),
          columnCount: 1,
          pageIndex: panel.pageIndex,
        }
        if (frag.startItemIndex > 0) {
          layout.startItemIndex = frag.startItemIndex
        }

        layouts.push(layout)
        yPx += fragmentHeightPx
        // Don't set overflow here — content flowing past a panel boundary
        // is normal; the "panel full" check at the top of the loop will
        // push remaining items to the next panel. Only flowToNextPanel
        // marks true overflow (all panels exhausted).
      } else {
        // Doesn't fit — try to split. Use reduced remaining space so the
        // split point is conservative (accounts for estimation inaccuracy).
        const safeRemainingPx = remainingPx / TRI_FOLD_SAFETY
        const splitResult = findSplitPoint(
          section,
          typography,
          panel.contentWidthPx,
          safeRemainingPx,
          pageLayout.itemSeparator,
          frag.startItemIndex,
          pageLayout.variantDisplayMode,
        )

        if (splitResult.splitIndex > frag.startItemIndex) {
          // Place the first part in this panel
          const usedHeightPx = splitResult.usedHeight * HEIGHT_BUFFER
          const yPct = V_PAD_PCT + (yPx / contentHeightPx) * 100
          const heightPct = (usedHeightPx / contentHeightPx) * 100

          layouts.push({
            sectionId: frag.sectionId,
            polygon: rectToPolygon(panel.innerLeftPct, yPct, panel.innerWidthPct, heightPct),
            columnCount: 1,
            pageIndex: panel.pageIndex,
            startItemIndex: frag.startItemIndex > 0 ? frag.startItemIndex : undefined,
            endItemIndex: splitResult.splitIndex,
          })

          yPx += usedHeightPx

          // Flow continuation + remaining queue items to next panel
          flowToNextPanel([
            { sectionId: frag.sectionId, startItemIndex: splitResult.splitIndex },
            ...queue.splice(0),
          ], panelIdx)
          break
        } else if (yPx > 0) {
          // Can't fit any items — panel has content, flow to next panel
          flowToNextPanel([frag, ...queue.splice(0)], panelIdx)
          break
        } else {
          // Panel is empty but section still doesn't fit (extremely large item).
          // Force-place to avoid infinite loop, mark overflow.
          const yPct = V_PAD_PCT
          const heightPct = (fragmentHeightPx / contentHeightPx) * 100

          const layout: SectionLayout = {
            sectionId: frag.sectionId,
            polygon: rectToPolygon(panel.innerLeftPct, yPct, panel.innerWidthPct, heightPct),
            columnCount: 1,
            pageIndex: panel.pageIndex,
          }
          if (frag.startItemIndex > 0) {
            layout.startItemIndex = frag.startItemIndex
          }

          layouts.push(layout)
          yPx += fragmentHeightPx
          overflow = true
        }
      }
    }
  }

  // Force-place any overflow fragments in the last panel so no items are lost.
  // They will clip visually, but the data exists so the preview can show an
  // overflow indicator and the user can see all their content.
  if (overflowFragments.length > 0 && panels.length > 0) {
    const lastPanel = panels[panels.length - 1]
    // Find the current bottom of the last panel's content
    let lastPanelBottomPx = 0
    for (const l of layouts) {
      if (l.pageIndex === lastPanel.pageIndex) {
        const polyBottom = l.polygon[2][1]  // bottom-left vertex y%
        const bottomPx = (polyBottom / 100) * contentHeightPx
        if (bottomPx > lastPanelBottomPx) lastPanelBottomPx = bottomPx
      }
    }

    for (const frag of overflowFragments) {
      const section = sectionMap.get(frag.sectionId)
      if (!section) continue
      const items = (section.items || []).filter((item: any) => item.isAvailable !== false)
      if (frag.startItemIndex >= items.length) continue

      const result = estimateSectionHeight(
        frag.startItemIndex === 0 ? section : { ...section, items: items.slice(frag.startItemIndex) },
        typography,
        lastPanel.contentWidthPx,
        1,
        pageLayout.itemSeparator,
        pageLayout.variantDisplayMode,
        pageLayout.sectionTitleDecoration,
      )
      const fragmentHeightPx = (result.estimatedHeight + 4) * HEIGHT_BUFFER
      const yPct = (lastPanelBottomPx / contentHeightPx) * 100
      const heightPct = (fragmentHeightPx / contentHeightPx) * 100

      const layout: SectionLayout = {
        sectionId: frag.sectionId,
        polygon: rectToPolygon(lastPanel.innerLeftPct, yPct, lastPanel.innerWidthPct, heightPct),
        columnCount: 1,
        pageIndex: lastPanel.pageIndex,
      }
      if (frag.startItemIndex > 0) {
        layout.startItemIndex = frag.startItemIndex
      }
      layouts.push(layout)
      lastPanelBottomPx += fragmentHeightPx
    }
  }

  return { layouts, overflow }
}
