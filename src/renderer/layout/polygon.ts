import type { Vertex } from '../models/layout'

export interface BoundingBox {
  x: number      // min x %
  y: number      // min y %
  width: number  // %
  height: number // %
}

/** Compute axis-aligned bounding box from polygon vertices (percentage coords) */
export function boundingBox(polygon: Vertex[]): BoundingBox {
  if (polygon.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of polygon) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Convert polygon vertices to a CSS clip-path polygon() string.
 * Coordinates are mapped relative to the bounding box (0%-100%).
 */
export function polygonToClipPath(polygon: Vertex[], bbox: BoundingBox): string {
  const points = polygon.map(([x, y]) => {
    const relX = bbox.width > 0 ? ((x - bbox.x) / bbox.width) * 100 : 0
    const relY = bbox.height > 0 ? ((y - bbox.y) / bbox.height) * 100 : 0
    return `${relX}% ${relY}%`
  })
  return `polygon(${points.join(', ')})`
}

export interface ExclusionFloats {
  left: { width: string; shape: string }
  right: { width: string; shape: string }
}

/**
 * Compute left/right CSS shape-outside floats for text reflow inside a polygon.
 *
 * For each horizontal slice of the bounding box, the polygon's left and right
 * edges define insets. We generate float elements that push content to flow
 * only within the polygon's bounds.
 */
export function computeExclusionFloats(polygon: Vertex[], bbox: BoundingBox): ExclusionFloats {
  if (bbox.width === 0 || bbox.height === 0) {
    return {
      left: { width: '0px', shape: 'none' },
      right: { width: '0px', shape: 'none' },
    }
  }

  // Sample the polygon at multiple y-levels to build contour
  const SAMPLES = 20
  const leftInsets: number[] = []   // percentage of bbox width from left
  const rightInsets: number[] = []  // percentage of bbox width from right

  for (let i = 0; i <= SAMPLES; i++) {
    const yFraction = i / SAMPLES
    const yAbs = bbox.y + yFraction * bbox.height

    // Find horizontal intersection of polygon at this y-level
    const intersections = polygonHorizontalIntersections(polygon, yAbs)

    if (intersections.length >= 2) {
      const minX = Math.min(...intersections)
      const maxX = Math.max(...intersections)
      const leftPct = ((minX - bbox.x) / bbox.width) * 100
      const rightPct = ((bbox.x + bbox.width - maxX) / bbox.width) * 100
      leftInsets.push(Math.max(0, leftPct))
      rightInsets.push(Math.max(0, rightPct))
    } else {
      // Outside polygon at this y-level, full inset
      leftInsets.push(50)
      rightInsets.push(50)
    }
  }

  const maxLeftInset = Math.max(...leftInsets)
  const maxRightInset = Math.max(...rightInsets)

  // If insets are negligible (< 1%), skip floats (rectangular polygon)
  if (maxLeftInset < 1 && maxRightInset < 1) {
    return {
      left: { width: '0px', shape: 'none' },
      right: { width: '0px', shape: 'none' },
    }
  }

  // Build left float shape-outside polygon
  const leftPoints: string[] = []
  const rightPoints: string[] = []

  for (let i = 0; i <= SAMPLES; i++) {
    const yPct = (i / SAMPLES) * 100
    leftPoints.push(`${leftInsets[i]}% ${yPct}%`)
    rightPoints.push(`${rightInsets[i]}% ${yPct}%`)
  }

  // Close the left float shape: right edge at max width, then back
  const leftShape = `polygon(0% 0%, ${leftPoints.join(', ')}, 0% 100%)`
  const rightShape = `polygon(100% 0%, ${rightPoints.map(p => {
    const [xStr, yStr] = p.split(' ')
    return `${100 - parseFloat(xStr)}% ${yStr}`
  }).join(', ')}, 100% 100%)`

  return {
    left: {
      width: `${maxLeftInset}%`,
      shape: leftShape,
    },
    right: {
      width: `${maxRightInset}%`,
      shape: rightShape,
    },
  }
}

/** Find x-coordinates where a horizontal line at yLevel intersects polygon edges */
function polygonHorizontalIntersections(polygon: Vertex[], yLevel: number): number[] {
  const intersections: number[] = []
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[(i + 1) % n]

    // Check if edge crosses this y-level
    if ((y1 <= yLevel && y2 > yLevel) || (y2 <= yLevel && y1 > yLevel)) {
      const t = (yLevel - y1) / (y2 - y1)
      intersections.push(x1 + t * (x2 - x1))
    }
  }

  return intersections.sort((a, b) => a - b)
}

/** Ray-casting point-in-polygon test */
export function pointInPolygon(point: Vertex, polygon: Vertex[]): boolean {
  const [px, py] = point
  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

/** Validate polygon: min 3 vertices, no self-intersection */
export function isValidPolygon(polygon: Vertex[]): boolean {
  if (polygon.length < 3) return false

  // Check for self-intersection: test each pair of non-adjacent edges
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue // skip adjacent (first-last)
      if (segmentsIntersect(
        polygon[i], polygon[(i + 1) % n],
        polygon[j], polygon[(j + 1) % n],
      )) {
        return false
      }
    }
  }

  return true
}

/** Check if two line segments intersect (proper intersection only) */
function segmentsIntersect(a1: Vertex, a2: Vertex, b1: Vertex, b2: Vertex): boolean {
  const d1 = cross(b1, b2, a1)
  const d2 = cross(b1, b2, a2)
  const d3 = cross(a1, a2, b1)
  const d4 = cross(a1, a2, b2)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  return false
}

function cross(o: Vertex, a: Vertex, b: Vertex): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

/** Convert rect (x, y, width, height in %) to 4-vertex polygon */
export function rectToPolygon(x: number, y: number, w: number, h: number): Vertex[] {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
}
