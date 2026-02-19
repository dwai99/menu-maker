import { describe, it, expect } from 'vitest'
import {
    computeTriFoldPanelGeometry,
    getTriFoldFoldLines,
    getTriFoldFoldLinesByType,
    getTriFoldLineStyle,
    autoDistributeTriFold,
} from '../tri-fold'
import { PAGE_SIZES } from '../../models/layout'
import type { TriFoldPaperSize, TriFoldType } from '../../models/layout'

describe('Tri-fold Layout Engine', () => {
    // ── computeTriFoldPanelGeometry ────────────────────────────
    describe('computeTriFoldPanelGeometry', () => {
        it('should return exactly 6 panels', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            expect(panels).toHaveLength(6)
        })

        it('should return 3 front panels (pageIndex 0) and 3 back panels (pageIndex 1)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const front = panels.filter(p => p.pageIndex === 0)
            const back = panels.filter(p => p.pageIndex === 1)
            expect(front).toHaveLength(3)
            expect(back).toHaveLength(3)
        })

        it('should assign correct roles to front panels (left→right: back, inner-flap, cover)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            expect(frontPanels[0].role).toBe('back')
            expect(frontPanels[1].role).toBe('inner-flap')
            expect(frontPanels[2].role).toBe('cover')
        })

        it('should assign correct roles to back panels (left→right: inside-left, inside-center, inside-right)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const backPanels = panels.filter(p => p.pageIndex === 1)
            expect(backPanels[0].role).toBe('inside-left')
            expect(backPanels[1].role).toBe('inside-center')
            expect(backPanels[2].role).toBe('inside-right')
        })

        it('should have panels with positive width and height for letter paper', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            for (const panel of panels) {
                expect(panel.width).toBeGreaterThan(0)
                expect(panel.height).toBeGreaterThan(0)
            }
        })

        it('should have panels with positive width and height for legal paper', () => {
            const panels = computeTriFoldPanelGeometry('legal')
            for (const panel of panels) {
                expect(panel.width).toBeGreaterThan(0)
                expect(panel.height).toBeGreaterThan(0)
            }
        })

        it('inner-flap panel should be slightly narrower than outer panels for letter', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            const backPanel = frontPanels[0] // 'back' panel
            const flapPanel = frontPanels[1] // 'inner-flap' panel
            const coverPanel = frontPanels[2] // 'cover' panel

            // inner-flap is 1/16" narrower for fold clearance
            expect(flapPanel.width).toBeLessThan(backPanel.width)
            expect(flapPanel.width).toBeLessThan(coverPanel.width)
        })

        it('back and cover panels should have the same width for letter paper', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            const backPanelWidth = frontPanels[0].width
            const coverPanelWidth = frontPanels[2].width
            expect(backPanelWidth).toBeCloseTo(coverPanelWidth, 5)
        })

        it('total width of front panels should equal paper width in landscape for letter', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            const totalWidth = frontPanels.reduce((sum, p) => sum + p.width, 0)

            // Letter in landscape: 11" wide
            const paperWidth = Math.max(PAGE_SIZES.letter.width, PAGE_SIZES.letter.height)
            expect(totalWidth).toBeCloseTo(paperWidth, 5)
        })

        it('total width of front panels should equal legal paper width in landscape', () => {
            const panels = computeTriFoldPanelGeometry('legal')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            const totalWidth = frontPanels.reduce((sum, p) => sum + p.width, 0)

            // Legal in landscape: 14" wide
            const paperWidth = Math.max(PAGE_SIZES.legal.width, PAGE_SIZES.legal.height)
            expect(totalWidth).toBeCloseTo(paperWidth, 5)
        })

        it('all panels should have the correct paper height', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            // Letter in landscape: height is 8.5"
            const paperHeight = Math.min(PAGE_SIZES.letter.width, PAGE_SIZES.letter.height)
            for (const panel of panels) {
                expect(panel.height).toBeCloseTo(paperHeight, 5)
            }
        })

        it('legal paper should produce taller panels than letter', () => {
            const letterPanels = computeTriFoldPanelGeometry('letter')
            const legalPanels = computeTriFoldPanelGeometry('legal')
            // Legal in landscape is 14" wide with 8.5" height — same height as letter landscape
            // but wider panels
            const letterFlapWidth = letterPanels.find(p => p.role === 'inner-flap')!.width
            const legalFlapWidth = legalPanels.find(p => p.role === 'inner-flap')!.width
            expect(legalFlapWidth).toBeGreaterThan(letterFlapWidth)
        })

        it('panels should have y=0 (starting from top)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            for (const panel of panels) {
                expect(panel.y).toBe(0)
            }
        })

        it('front panels should be laid out left-to-right (x increases)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            expect(frontPanels[0].x).toBe(0)
            expect(frontPanels[1].x).toBeGreaterThan(frontPanels[0].x)
            expect(frontPanels[2].x).toBeGreaterThan(frontPanels[1].x)
        })

        it('back panels should be laid out left-to-right (x increases)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const backPanels = panels.filter(p => p.pageIndex === 1)
            expect(backPanels[0].x).toBe(0)
            expect(backPanels[1].x).toBeGreaterThan(backPanels[0].x)
            expect(backPanels[2].x).toBeGreaterThan(backPanels[1].x)
        })
    })

    // ── getTriFoldFoldLines ────────────────────────────────────
    describe('getTriFoldFoldLines', () => {
        it('should return a tuple of exactly 2 numbers', () => {
            const lines = getTriFoldFoldLines('letter')
            expect(lines).toHaveLength(2)
        })

        it('should return percentages between 0 and 100 for letter', () => {
            const [fold1, fold2] = getTriFoldFoldLines('letter')
            expect(fold1).toBeGreaterThan(0)
            expect(fold1).toBeLessThan(100)
            expect(fold2).toBeGreaterThan(0)
            expect(fold2).toBeLessThan(100)
        })

        it('fold1 should be before fold2 (left fold before right fold)', () => {
            const [fold1, fold2] = getTriFoldFoldLines('letter')
            expect(fold1).toBeLessThan(fold2)
        })

        it('should return valid fold percentages for legal paper', () => {
            const [fold1, fold2] = getTriFoldFoldLines('legal')
            expect(fold1).toBeGreaterThan(0)
            expect(fold2).toBeGreaterThan(fold1)
            expect(fold2).toBeLessThan(100)
        })

        it('letter paper folds should be approximately at thirds (with fold clearance)', () => {
            const [fold1, fold2] = getTriFoldFoldLines('letter')
            // Without clearance they'd be exactly 33.33% and 66.67%
            // With clearance the inner-flap is slightly narrower so values differ slightly
            expect(fold1).toBeCloseTo(33.33, 0)
            expect(fold2).toBeCloseTo(66.67, 0)
        })

        it('legal paper folds should be at approximately thirds', () => {
            const [fold1, fold2] = getTriFoldFoldLines('legal')
            expect(fold1).toBeCloseTo(33.33, 0)
            expect(fold2).toBeCloseTo(66.67, 0)
        })
    })

    // ── getTriFoldFoldLinesByType ──────────────────────────────
    describe('getTriFoldFoldLinesByType', () => {
        it('should return equal thirds for z-fold', () => {
            const [fold1, fold2] = getTriFoldFoldLinesByType('letter', 'z-fold')
            expect(fold1).toBeCloseTo(33.333, 2)
            expect(fold2).toBeCloseTo(66.667, 2)
        })

        it('z-fold should produce equal thirds for both letter and legal', () => {
            const letterFolds = getTriFoldFoldLinesByType('letter', 'z-fold')
            const legalFolds = getTriFoldFoldLinesByType('legal', 'z-fold')
            expect(letterFolds[0]).toBe(legalFolds[0])
            expect(letterFolds[1]).toBe(legalFolds[1])
        })

        it('should return gate-fold positions (outer ~27.5%, inner ~72.5%)', () => {
            const [fold1, fold2] = getTriFoldFoldLinesByType('letter', 'gate-fold')
            expect(fold1).toBeCloseTo(27.5, 1)
            expect(fold2).toBeCloseTo(72.5, 1)
        })

        it('gate-fold outer panels should each be ~27.5% wide', () => {
            const [fold1, fold2] = getTriFoldFoldLinesByType('letter', 'gate-fold')
            const rightPanelWidth = 100 - fold2
            expect(fold1).toBeCloseTo(rightPanelWidth, 1)
        })

        it('gate-fold center panel should be ~45% wide', () => {
            const [fold1, fold2] = getTriFoldFoldLinesByType('letter', 'gate-fold')
            const centerWidth = fold2 - fold1
            expect(centerWidth).toBeCloseTo(45, 0)
        })

        it('should delegate to getTriFoldFoldLines for letter-fold type', () => {
            const byType = getTriFoldFoldLinesByType('letter', 'letter-fold')
            const direct = getTriFoldFoldLines('letter')
            expect(byType[0]).toBe(direct[0])
            expect(byType[1]).toBe(direct[1])
        })

        it('should use letter-fold as default when no foldType is provided', () => {
            const byType = getTriFoldFoldLinesByType('letter')
            const direct = getTriFoldFoldLines('letter')
            expect(byType[0]).toBe(direct[0])
            expect(byType[1]).toBe(direct[1])
        })

        it('fold1 should always be less than fold2 for all fold types', () => {
            const foldTypes: TriFoldType[] = ['letter-fold', 'z-fold', 'gate-fold']
            const paperSizes: TriFoldPaperSize[] = ['letter', 'legal']
            for (const paperSize of paperSizes) {
                for (const foldType of foldTypes) {
                    const [fold1, fold2] = getTriFoldFoldLinesByType(paperSize, foldType)
                    expect(fold1).toBeLessThan(fold2)
                }
            }
        })
    })

    // ── getTriFoldLineStyle ────────────────────────────────────
    describe('getTriFoldLineStyle', () => {
        it('should return dashed style for letter-fold', () => {
            const style = getTriFoldLineStyle('letter-fold', 0)
            expect(style).toContain('dashed')
        })

        it('should return dashed style for letter-fold line index 1', () => {
            const style = getTriFoldLineStyle('letter-fold', 1)
            expect(style).toContain('dashed')
        })

        it('should return solid style for z-fold mountain fold (lineIndex 0)', () => {
            const style = getTriFoldLineStyle('z-fold', 0)
            expect(style).toContain('solid')
        })

        it('should return dashed style for z-fold valley fold (lineIndex 1)', () => {
            const style = getTriFoldLineStyle('z-fold', 1)
            expect(style).toContain('dashed')
        })

        it('z-fold mountain and valley styles should be different', () => {
            const mountain = getTriFoldLineStyle('z-fold', 0)
            const valley = getTriFoldLineStyle('z-fold', 1)
            expect(mountain).not.toBe(valley)
        })

        it('should return dashed style for gate-fold', () => {
            const style0 = getTriFoldLineStyle('gate-fold', 0)
            const style1 = getTriFoldLineStyle('gate-fold', 1)
            expect(style0).toContain('dashed')
            expect(style1).toContain('dashed')
        })

        it('gate-fold and letter-fold should have the same style pattern', () => {
            const gateFold0 = getTriFoldLineStyle('gate-fold', 0)
            const letterFold0 = getTriFoldLineStyle('letter-fold', 0)
            expect(gateFold0).toBe(letterFold0)
        })

        it('should return a non-empty CSS string', () => {
            expect(getTriFoldLineStyle('letter-fold', 0)).toBeTruthy()
            expect(getTriFoldLineStyle('z-fold', 0)).toBeTruthy()
            expect(getTriFoldLineStyle('gate-fold', 0)).toBeTruthy()
        })

        it('should use default fold type when none provided', () => {
            const defaultStyle = getTriFoldLineStyle(undefined as any, 0)
            const letterFoldStyle = getTriFoldLineStyle('letter-fold', 0)
            expect(defaultStyle).toBe(letterFoldStyle)
        })
    })

    // ── autoDistributeTriFold ─────────────────────────────────
    describe('autoDistributeTriFold', () => {
        it('should initialize all 6 panel roles', () => {
            const result = autoDistributeTriFold([])
            const roles = Object.keys(result)
            expect(roles).toContain('cover')
            expect(roles).toContain('back')
            expect(roles).toContain('inner-flap')
            expect(roles).toContain('inside-left')
            expect(roles).toContain('inside-center')
            expect(roles).toContain('inside-right')
        })

        it('should distribute sections across inside panels evenly', () => {
            const sections = ['sec-1', 'sec-2', 'sec-3']
            const result = autoDistributeTriFold(sections)
            expect(result['inside-left']).toContain('sec-1')
            expect(result['inside-center']).toContain('sec-2')
            expect(result['inside-right']).toContain('sec-3')
        })

        it('should wrap distribution across inside panels for more than 3 sections', () => {
            const sections = ['s1', 's2', 's3', 's4', 's5', 's6']
            const result = autoDistributeTriFold(sections)
            // s1, s4 → inside-left; s2, s5 → inside-center; s3, s6 → inside-right
            expect(result['inside-left']).toEqual(['s1', 's4'])
            expect(result['inside-center']).toEqual(['s2', 's5'])
            expect(result['inside-right']).toEqual(['s3', 's6'])
        })

        it('should leave cover, back, inner-flap empty', () => {
            const sections = ['sec-1', 'sec-2']
            const result = autoDistributeTriFold(sections)
            expect(result['cover']).toEqual([])
            expect(result['back']).toEqual([])
            expect(result['inner-flap']).toEqual([])
        })

        it('should handle a single section', () => {
            const result = autoDistributeTriFold(['only-section'])
            expect(result['inside-left']).toEqual(['only-section'])
            expect(result['inside-center']).toEqual([])
            expect(result['inside-right']).toEqual([])
        })

        it('should handle empty section list', () => {
            const result = autoDistributeTriFold([])
            expect(result['inside-left']).toEqual([])
            expect(result['inside-center']).toEqual([])
            expect(result['inside-right']).toEqual([])
        })
    })
})
