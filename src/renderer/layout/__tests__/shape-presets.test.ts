import { describe, it, expect } from 'vitest'
import {
    circlePolygon,
    ellipsePolygon,
    diamondPolygon,
    hexagonPolygon,
    octagonPolygon,
    archPolygon,
    shieldPolygon,
    roundedRectPolygon,
    SHAPE_PRESETS,
} from '../shape-presets'
import { isValidPolygon, boundingBox } from '../polygon'

describe('Shape Presets', () => {
    // ── Circle ────────────────────────────────────────────────
    describe('circlePolygon', () => {
        it('should generate a valid polygon', () => {
            const poly = circlePolygon()
            expect(isValidPolygon(poly)).toBe(true)
        })

        it('should default to 32 segments', () => {
            expect(circlePolygon().length).toBe(32)
        })

        it('should allow custom segment count', () => {
            expect(circlePolygon(50, 50, 45, 64).length).toBe(64)
        })

        it('should be centered at 50,50 by default', () => {
            const poly = circlePolygon()
            const bbox = boundingBox(poly)
            expect(bbox.x).toBeCloseTo(5, 0)
            expect(bbox.y).toBeCloseTo(5, 0)
            expect(bbox.width).toBeCloseTo(90, 0)
            expect(bbox.height).toBeCloseTo(90, 0)
        })
    })

    // ── Ellipse ───────────────────────────────────────────────
    describe('ellipsePolygon', () => {
        it('should generate a valid polygon', () => {
            const poly = ellipsePolygon()
            expect(isValidPolygon(poly)).toBe(true)
        })

        it('should create wider-than-tall shape by default', () => {
            const poly = ellipsePolygon(50, 50, 48, 35)
            const bbox = boundingBox(poly)
            expect(bbox.width).toBeGreaterThan(bbox.height)
        })
    })

    // ── Diamond ───────────────────────────────────────────────
    describe('diamondPolygon', () => {
        it('should generate 4 vertices', () => {
            expect(diamondPolygon().length).toBe(4)
        })

        it('should be valid', () => {
            expect(isValidPolygon(diamondPolygon())).toBe(true)
        })

        it('should have top vertex at center x', () => {
            const poly = diamondPolygon(50, 50, 90, 90)
            expect(poly[0][0]).toBe(50) // top center
        })
    })

    // ── Hexagon ───────────────────────────────────────────────
    describe('hexagonPolygon', () => {
        it('should generate 6 vertices', () => {
            expect(hexagonPolygon().length).toBe(6)
        })

        it('should be valid', () => {
            expect(isValidPolygon(hexagonPolygon())).toBe(true)
        })
    })

    // ── Octagon ───────────────────────────────────────────────
    describe('octagonPolygon', () => {
        it('should generate 8 vertices', () => {
            expect(octagonPolygon().length).toBe(8)
        })

        it('should be valid', () => {
            expect(isValidPolygon(octagonPolygon())).toBe(true)
        })
    })

    // ── Arch ──────────────────────────────────────────────────
    describe('archPolygon', () => {
        it('should generate a valid polygon', () => {
            const poly = archPolygon()
            expect(isValidPolygon(poly)).toBe(true)
        })

        it('should have more than 4 vertices (curved top)', () => {
            const poly = archPolygon()
            expect(poly.length).toBeGreaterThan(4)
        })
    })

    // ── Shield ────────────────────────────────────────────────
    describe('shieldPolygon', () => {
        it('should generate 8 vertices', () => {
            expect(shieldPolygon().length).toBe(8)
        })

        it('should be valid', () => {
            expect(isValidPolygon(shieldPolygon())).toBe(true)
        })

        it('should have bottom point at center x', () => {
            const poly = shieldPolygon()
            const bottomY = Math.max(...poly.map(v => v[1]))
            const bottomVertex = poly.find(v => v[1] === bottomY)!
            expect(bottomVertex[0]).toBe(50)
        })
    })

    // ── Rounded Rectangle ────────────────────────────────────
    describe('roundedRectPolygon', () => {
        it('should generate a valid polygon', () => {
            const poly = roundedRectPolygon()
            expect(isValidPolygon(poly)).toBe(true)
        })

        it('should have more vertices than a regular rectangle', () => {
            expect(roundedRectPolygon().length).toBeGreaterThan(4)
        })

        it('should stay within bounds', () => {
            const poly = roundedRectPolygon(5, 5, 90, 90)
            for (const [x, y] of poly) {
                expect(x).toBeGreaterThanOrEqual(4.9) // floating point tolerance
                expect(x).toBeLessThanOrEqual(95.1)
                expect(y).toBeGreaterThanOrEqual(4.9)
                expect(y).toBeLessThanOrEqual(95.1)
            }
        })
    })

    // ── SHAPE_PRESETS map ─────────────────────────────────────
    describe('SHAPE_PRESETS', () => {
        const presetIds = Object.keys(SHAPE_PRESETS)

        it('should have at least 6 presets', () => {
            expect(presetIds.length).toBeGreaterThanOrEqual(6)
        })

        it('should generate valid polygons for all presets', () => {
            for (const id of presetIds) {
                const preset = SHAPE_PRESETS[id as keyof typeof SHAPE_PRESETS]
                const poly = preset.generate()
                expect(poly.length).toBeGreaterThanOrEqual(3)
                expect(preset.label).toBeTruthy()
                expect(preset.icon).toBeTruthy()
            }
        })

        it('should include rectangle, circle, and diamond at minimum', () => {
            expect(SHAPE_PRESETS.rectangle).toBeDefined()
            expect(SHAPE_PRESETS.circle).toBeDefined()
            expect(SHAPE_PRESETS.diamond).toBeDefined()
        })
    })
})
