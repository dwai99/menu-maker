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

import type { TriFoldPanelRole, TriFoldPaperSize, TriFoldConfig, TriFoldType } from '@/models/layout'
import { PAGE_SIZES } from '@/models/layout'
import { TRI_FOLD_FRONT_PANELS, TRI_FOLD_BACK_PANELS } from '@/models/layout'

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
 * Auto-distribute sections across tri-fold panels.
 * - cover: gets title/logo only (no sections by default)
 * - back: gets footer section if present, otherwise empty
 * - inner-flap: empty by default (or overflow from inside)
 * - inside-left, inside-center, inside-right: evenly distributed menu sections
 */
export function autoDistributeTriFold(
  sectionIds: string[],
): TriFoldConfig['panelSections'] {
  const panelSections: Partial<Record<TriFoldPanelRole, string[]>> = {
    'cover': [],
    'back': [],
    'inner-flap': [],
    'inside-left': [],
    'inside-center': [],
    'inside-right': [],
  }

  // Distribute sections across the 3 inside panels
  const insidePanels: TriFoldPanelRole[] = ['inside-left', 'inside-center', 'inside-right']
  sectionIds.forEach((id, i) => {
    const panelIndex = i % 3
    panelSections[insidePanels[panelIndex]]!.push(id)
  })

  return panelSections
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

  // Front: back(normalWidth) | inner-flap(flapWidth) | cover(normalWidth)
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
