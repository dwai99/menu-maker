import type { SectionLayout } from '../models/layout'
import { boundingBox, rectToPolygon } from './polygon'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Extract bounding rect from a section layout */
function toRect(s: SectionLayout): Rect {
  return boundingBox(s.polygon)
}

/** Rebuild a section's polygon as a rectangle at the given position/size */
function withRect(s: SectionLayout, r: Rect): SectionLayout {
  return { ...s, polygon: rectToPolygon(r.x, r.y, r.width, r.height) }
}

// ── Align ──────────────────────────────────────────────────────────

/** Align all sections' left edges to the leftmost section's left edge */
export function alignLeft(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const minX = Math.min(...rects.map((r) => r.x))
  return layouts.map((s, i) => withRect(s, { ...rects[i], x: minX }))
}

/** Align all sections' right edges to the rightmost section's right edge */
export function alignRight(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const maxRight = Math.max(...rects.map((r) => r.x + r.width))
  return layouts.map((s, i) =>
    withRect(s, { ...rects[i], x: maxRight - rects[i].width })
  )
}

/** Align all sections' top edges to the topmost section's top edge */
export function alignTop(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const minY = Math.min(...rects.map((r) => r.y))
  return layouts.map((s, i) => withRect(s, { ...rects[i], y: minY }))
}

/** Align all sections' bottom edges to the bottommost section's bottom edge */
export function alignBottom(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const maxBottom = Math.max(...rects.map((r) => r.y + r.height))
  return layouts.map((s, i) =>
    withRect(s, { ...rects[i], y: maxBottom - rects[i].height })
  )
}

/** Align all sections' horizontal centers to the average center X */
export function alignCenterH(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const avgCenterX =
    rects.reduce((sum, r) => sum + r.x + r.width / 2, 0) / rects.length
  return layouts.map((s, i) =>
    withRect(s, { ...rects[i], x: avgCenterX - rects[i].width / 2 })
  )
}

/** Align all sections' vertical centers to the average center Y */
export function alignCenterV(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const avgCenterY =
    rects.reduce((sum, r) => sum + r.y + r.height / 2, 0) / rects.length
  return layouts.map((s, i) =>
    withRect(s, { ...rects[i], y: avgCenterY - rects[i].height / 2 })
  )
}

// ── Distribute ─────────────────────────────────────────────────────

/** Distribute sections with equal horizontal gaps between them */
export function distributeH(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 3) return layouts
  const rects = layouts.map(toRect)

  // Sort indices by x position
  const indices = rects.map((_, i) => i).sort((a, b) => rects[a].x - rects[b].x)
  const totalWidth = rects.reduce((sum, r) => sum + r.width, 0)
  const first = rects[indices[0]]
  const last = rects[indices[indices.length - 1]]
  const span = last.x + last.width - first.x
  const gap = (span - totalWidth) / (layouts.length - 1)

  const result = [...layouts]
  let currentX = first.x
  for (const idx of indices) {
    result[idx] = withRect(layouts[idx], { ...rects[idx], x: currentX })
    currentX += rects[idx].width + gap
  }
  return result
}

/** Distribute sections with equal vertical gaps between them */
export function distributeV(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 3) return layouts
  const rects = layouts.map(toRect)

  // Sort indices by y position
  const indices = rects.map((_, i) => i).sort((a, b) => rects[a].y - rects[b].y)
  const totalHeight = rects.reduce((sum, r) => sum + r.height, 0)
  const first = rects[indices[0]]
  const last = rects[indices[indices.length - 1]]
  const span = last.y + last.height - first.y
  const gap = (span - totalHeight) / (layouts.length - 1)

  const result = [...layouts]
  let currentY = first.y
  for (const idx of indices) {
    result[idx] = withRect(layouts[idx], { ...rects[idx], y: currentY })
    currentY += rects[idx].height + gap
  }
  return result
}

// ── Size equalization ──────────────────────────────────────────────

/** Set all sections to the maximum width found */
export function equalWidth(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const maxW = Math.max(...rects.map((r) => r.width))
  return layouts.map((s, i) => withRect(s, { ...rects[i], width: maxW }))
}

/** Set all sections to the maximum height found */
export function equalHeight(layouts: SectionLayout[]): SectionLayout[] {
  if (layouts.length < 2) return layouts
  const rects = layouts.map(toRect)
  const maxH = Math.max(...rects.map((r) => r.height))
  return layouts.map((s, i) => withRect(s, { ...rects[i], height: maxH }))
}
