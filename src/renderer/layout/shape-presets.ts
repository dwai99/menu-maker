import type { Vertex } from '../models/layout'

/**
 * Shape preset generators.
 * All shapes are generated as polygons in percentage coordinates (0-100).
 */

/**
 * Generate a regular polygon (circle approximation) centered at (cx, cy).
 * @param cx - Center X (0-100)
 * @param cy - Center Y (0-100)
 * @param rx - Horizontal radius (0-50)
 * @param ry - Vertical radius (0-50)
 * @param segments - Number of vertices (higher = smoother circle)
 */
export function ellipsePolygon(
    cx: number = 50,
    cy: number = 50,
    rx: number = 45,
    ry: number = 45,
    segments: number = 32
): Vertex[] {
    const vertices: Vertex[] = []
    for (let i = 0; i < segments; i++) {
        const angle = (2 * Math.PI * i) / segments - Math.PI / 2 // start from top
        const x = cx + rx * Math.cos(angle)
        const y = cy + ry * Math.sin(angle)
        vertices.push([x, y])
    }
    return vertices
}

/**
 * Generate a circle (regular polygon) centered at (cx, cy).
 */
export function circlePolygon(
    cx: number = 50,
    cy: number = 50,
    radius: number = 45,
    segments: number = 32
): Vertex[] {
    return ellipsePolygon(cx, cy, radius, radius, segments)
}

/**
 * Generate a diamond shape.
 */
export function diamondPolygon(
    cx: number = 50,
    cy: number = 50,
    width: number = 90,
    height: number = 90
): Vertex[] {
    const hw = width / 2
    const hh = height / 2
    return [
        [cx, cy - hh],     // top
        [cx + hw, cy],     // right
        [cx, cy + hh],     // bottom
        [cx - hw, cy],     // left
    ]
}

/**
 * Generate a regular hexagon.
 */
export function hexagonPolygon(
    cx: number = 50,
    cy: number = 50,
    radius: number = 45
): Vertex[] {
    return circlePolygon(cx, cy, radius, 6)
}

/**
 * Generate an octagon.
 */
export function octagonPolygon(
    cx: number = 50,
    cy: number = 50,
    radius: number = 45
): Vertex[] {
    return circlePolygon(cx, cy, radius, 8)
}

/**
 * Generate an arch (rectangle with a rounded top).
 */
export function archPolygon(
    x: number = 5,
    y: number = 5,
    width: number = 90,
    height: number = 90,
    archSegments: number = 16
): Vertex[] {
    const vertices: Vertex[] = []
    const cx = x + width / 2
    const archRadius = width / 2
    const archBottom = y + archRadius // where the arch curve ends

    // Top arch (semicircle from left to right)
    for (let i = 0; i <= archSegments; i++) {
        const angle = Math.PI + (Math.PI * i) / archSegments // π to 2π (bottom of circle)
        const px = cx + archRadius * Math.cos(angle)
        const py = archBottom + archRadius * Math.sin(angle)
        vertices.push([px, Math.max(y, py)])
    }

    // Bottom right
    vertices.push([x + width, y + height])
    // Bottom left
    vertices.push([x, y + height])

    return vertices
}

/**
 * Generate a shield / badge shape.
 */
export function shieldPolygon(
    cx: number = 50,
    cy: number = 45,
    width: number = 80,
    height: number = 90
): Vertex[] {
    const hw = width / 2
    const top = cy - height * 0.4
    const bottom = cy + height * 0.6

    return [
        [cx, top],                  // top center
        [cx + hw, top + height * 0.1],  // top right
        [cx + hw, cy],              // mid right
        [cx + hw * 0.6, bottom - height * 0.15], // lower right
        [cx, bottom],               // bottom point
        [cx - hw * 0.6, bottom - height * 0.15], // lower left
        [cx - hw, cy],              // mid left
        [cx - hw, top + height * 0.1],  // top left
    ]
}

/**
 * Generate a rounded rectangle polygon.
 */
export function roundedRectPolygon(
    x: number = 5,
    y: number = 5,
    width: number = 90,
    height: number = 90,
    cornerRadius: number = 10,
    segmentsPerCorner: number = 4
): Vertex[] {
    const vertices: Vertex[] = []
    const r = Math.min(cornerRadius, width / 2, height / 2)

    // Corners: top-right, bottom-right, bottom-left, top-left
    const corners = [
        { cx: x + width - r, cy: y + r, startAngle: -Math.PI / 2, endAngle: 0 },
        { cx: x + width - r, cy: y + height - r, startAngle: 0, endAngle: Math.PI / 2 },
        { cx: x + r, cy: y + height - r, startAngle: Math.PI / 2, endAngle: Math.PI },
        { cx: x + r, cy: y + r, startAngle: Math.PI, endAngle: (3 * Math.PI) / 2 },
    ]

    for (const corner of corners) {
        for (let i = 0; i <= segmentsPerCorner; i++) {
            const angle = corner.startAngle + (corner.endAngle - corner.startAngle) * (i / segmentsPerCorner)
            vertices.push([
                corner.cx + r * Math.cos(angle),
                corner.cy + r * Math.sin(angle),
            ])
        }
    }

    return vertices
}

/**
 * Map of preset shapes for the UI picker.
 */
export const SHAPE_PRESETS = {
    rectangle: {
        label: 'Rectangle',
        icon: '▬',
        generate: () => [[0, 0], [100, 0], [100, 100], [0, 100]] as Vertex[],
    },
    'rounded-rect': {
        label: 'Rounded Rectangle',
        icon: '▢',
        generate: () => roundedRectPolygon(),
    },
    circle: {
        label: 'Circle',
        icon: '●',
        generate: () => circlePolygon(),
    },
    ellipse: {
        label: 'Ellipse',
        icon: '⬮',
        generate: () => ellipsePolygon(50, 50, 48, 35),
    },
    diamond: {
        label: 'Diamond',
        icon: '◆',
        generate: () => diamondPolygon(),
    },
    hexagon: {
        label: 'Hexagon',
        icon: '⬡',
        generate: () => hexagonPolygon(),
    },
    octagon: {
        label: 'Octagon',
        icon: '⯃',
        generate: () => octagonPolygon(),
    },
    arch: {
        label: 'Arch',
        icon: '⌒',
        generate: () => archPolygon(),
    },
    shield: {
        label: 'Shield',
        icon: '🛡',
        generate: () => shieldPolygon(),
    },
} as const

export type ShapePresetId = keyof typeof SHAPE_PRESETS
