import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    computeTriFoldPanelGeometry,
    getTriFoldFoldLines,
    getTriFoldFoldLinesByType,
    getTriFoldLineStyle,
    autoDistributeTriFold,
    computeTriFoldLayout,
} from '../tri-fold'
import { boundingBox } from '../polygon'
import { PAGE_SIZES, createDefaultTypography } from '../../models/layout'
import type { TriFoldPaperSize, TriFoldType, PageLayout, TriFoldConfig } from '../../models/layout'
import type { MenuSection, MenuData } from '../../models/menu'

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

        it('should assign correct roles to front panels (left→right: inner-flap, back, cover)', () => {
            const panels = computeTriFoldPanelGeometry('letter')
            const frontPanels = panels.filter(p => p.pageIndex === 0)
            expect(frontPanels[0].role).toBe('inner-flap')
            expect(frontPanels[1].role).toBe('back')
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
        // --- Fallback behavior (no sections/pageLayout) ---
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

        it('should assign all sections to inside-left when no sections/pageLayout provided', () => {
            const sections = ['sec-1', 'sec-2', 'sec-3']
            const result = autoDistributeTriFold(sections)
            expect(result['inside-left']).toEqual(['sec-1', 'sec-2', 'sec-3'])
            expect(result['inside-center']).toEqual([])
            expect(result['inside-right']).toEqual([])
        })

        it('should assign all to inside-left when many sections but no height info', () => {
            const sections = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
            const result = autoDistributeTriFold(sections)
            expect(result['inside-left']).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'])
            expect(result['inside-center']).toEqual([])
            expect(result['inside-right']).toEqual([])
            expect(result['inner-flap']).toEqual([])
            expect(result['back']).toEqual([])
            expect(result['cover']).toEqual([])
        })

        it('should always leave cover empty', () => {
            const sections = ['sec-1', 'sec-2']
            const result = autoDistributeTriFold(sections)
            expect(result['cover']).toEqual([])
        })

        it('should handle a single section', () => {
            const result = autoDistributeTriFold(['only-section'])
            expect(result['inside-left']).toEqual(['only-section'])
        })

        it('should handle empty section list', () => {
            const result = autoDistributeTriFold([])
            expect(result['inside-left']).toEqual([])
        })

        // --- Height-aware distribution ---
        it('should distribute sections across multiple panels when sections + pageLayout provided', () => {
            // 4 sections with enough items to fill multiple panels
            const secs = [makeSection('s1', 10), makeSection('s2', 4), makeSection('s3', 11), makeSection('s4', 2)]
            const pageLayout = makeTriFoldPageLayout()
            const result = autoDistributeTriFold(
                secs.map(s => s.id),
                secs,
                pageLayout,
            )
            // Should use more than just inside-left
            const allAssigned = [
                ...(result['inside-left'] ?? []),
                ...(result['inside-center'] ?? []),
                ...(result['inside-right'] ?? []),
                ...(result['inner-flap'] ?? []),
                ...(result['back'] ?? []),
            ]
            expect(allAssigned).toHaveLength(4)
            // At least 2 panels should have sections
            const panelsWithContent = ['inside-left', 'inside-center', 'inside-right', 'inner-flap', 'back']
                .filter(p => (result[p as keyof typeof result] as string[]).length > 0)
            expect(panelsWithContent.length).toBeGreaterThanOrEqual(2)
            // Cover should always be empty
            expect(result['cover']).toEqual([])
        })

        it('should preserve section order across panels', () => {
            const secs = [makeSection('s1', 8), makeSection('s2', 8), makeSection('s3', 8)]
            const pageLayout = makeTriFoldPageLayout()
            const result = autoDistributeTriFold(secs.map(s => s.id), secs, pageLayout)
            // Collect all sections in panel order
            const orderedIds: string[] = []
            for (const panel of ['inside-left', 'inside-center', 'inside-right', 'inner-flap', 'back'] as const) {
                orderedIds.push(...(result[panel] ?? []))
            }
            expect(orderedIds).toEqual(['s1', 's2', 's3'])
        })

        it('should include all section IDs in the result', () => {
            const secs = [makeSection('a', 5), makeSection('b', 5), makeSection('c', 5), makeSection('d', 5)]
            const pageLayout = makeTriFoldPageLayout()
            const result = autoDistributeTriFold(secs.map(s => s.id), secs, pageLayout)
            const allIds = Object.values(result).flat()
            expect(allIds.sort()).toEqual(['a', 'b', 'c', 'd'])
        })

        it('should keep single small section in inside-left', () => {
            const secs = [makeSection('tiny', 2)]
            const pageLayout = makeTriFoldPageLayout()
            const result = autoDistributeTriFold(['tiny'], secs, pageLayout)
            expect(result['inside-left']).toEqual(['tiny'])
            expect(result['inside-center']).toEqual([])
            expect(result['inside-right']).toEqual([])
        })
    })
})

// ── computeTriFoldLayout ──────────────────────────────────────

// Mock canvas for measureTextWidth used by estimateSectionHeight
beforeEach(() => {
    const mockCtx = {
        font: '',
        measureText: (text: string) => ({ width: text.length * 7 }),
    }
    vi.spyOn(document, 'createElement').mockReturnValue({
        getContext: () => mockCtx,
    } as any)
})

function makeSection(id: string, itemCount: number): MenuSection {
    return {
        id,
        title: `Section ${id}`,
        subtitle: '',
        footnote: '',
        items: Array.from({ length: itemCount }, (_, i) => ({
            id: `${id}-item-${i}`,
            name: `Item ${i + 1}`,
            description: 'A menu item',
            price: '10.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
        })),
    }
}

function makeTriFoldPageLayout(overrides?: {
    foldType?: TriFoldType
    paperSize?: TriFoldPaperSize
    panelSections?: TriFoldConfig['panelSections']
}): PageLayout {
    return {
        pageSize: overrides?.paperSize ?? 'letter',
        orientation: 'landscape',
        margins: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 },
        columnCount: 1,
        layoutDirection: 'vertical',
        sectionLayouts: [],
        colorScheme: { background: '#fff', text: '#000', accent: '#000', border: '#ccc' },
        typography: createDefaultTypography(),
        itemSeparator: 'none',
        priceFormat: 'right-aligned',
        sectionDecoration: 'none',
        currency: '$',
        backgroundTexture: 'none',
        sectionDivider: 'none',
        pageBorder: 'none',
        sectionGap: 16,
        triFold: {
            enabled: true,
            paperSize: overrides?.paperSize ?? 'letter',
            foldType: overrides?.foldType ?? 'letter-fold',
            panelSections: overrides?.panelSections ?? {},
            coverShowTitle: true,
            coverShowSubtitle: true,
            coverShowLogo: true,
            backShowFooter: true,
        },
    }
}

function makeMenuData(sections: MenuSection[]): MenuData {
    return {
        title: 'Test Menu',
        subtitle: '',
        sections,
        footer: '',
    } as MenuData
}

describe('computeTriFoldLayout', () => {
    it('returns empty layouts when tri-fold is not enabled', () => {
        const sections = [makeSection('s1', 3)]
        const pageLayout = makeTriFoldPageLayout()
        pageLayout.triFold!.enabled = false
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.sectionLayouts).toEqual([])
        expect(result.pageCount).toBe(1)
    })

    it('returns empty layouts when no sections are assigned to panels', () => {
        const sections = [makeSection('s1', 3)]
        const pageLayout = makeTriFoldPageLayout({ panelSections: {} })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.sectionLayouts).toEqual([])
        expect(result.pageCount).toBe(2)
    })

    it('creates layouts for assigned sections', () => {
        const sections = [makeSection('s1', 3), makeSection('s2', 2)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: {
                'inside-left': ['s1'],
                'inside-center': ['s2'],
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.sectionLayouts).toHaveLength(2)
        expect(result.sectionLayouts[0].sectionId).toBe('s1')
        expect(result.sectionLayouts[1].sectionId).toBe('s2')
    })

    it('assigns correct pageIndex — 0 for front panels, 1 for inside panels', () => {
        const sections = [makeSection('s1', 2), makeSection('s2', 2)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: {
                'back': ['s1'],        // front (page 0)
                'inside-left': ['s2'], // back (page 1)
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        const s1Layout = result.sectionLayouts.find(l => l.sectionId === 's1')!
        const s2Layout = result.sectionLayouts.find(l => l.sectionId === 's2')!
        expect(s1Layout.pageIndex).toBe(0)
        expect(s2Layout.pageIndex).toBe(1)
    })

    it('positions sections within their panel bounds (left, center, right thirds)', () => {
        const sections = [makeSection('s1', 2), makeSection('s2', 2), makeSection('s3', 2)]
        const pageLayout = makeTriFoldPageLayout({
            foldType: 'z-fold', // equal thirds for easy verification
            panelSections: {
                'inside-left': ['s1'],
                'inside-center': ['s2'],
                'inside-right': ['s3'],
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })

        // z-fold: fold lines at 33.333% and 66.667% of paper width
        // After margin conversion these map to content-area percentages
        for (const sl of result.sectionLayouts) {
            const bbox = boundingBox(sl.polygon)
            expect(bbox.x).toBeGreaterThanOrEqual(0)
            expect(bbox.x + bbox.width).toBeLessThanOrEqual(100.1) // allow tiny float error
        }

        // s1 should be in the left third (x < ~35%)
        const s1Box = boundingBox(result.sectionLayouts[0].polygon)
        expect(s1Box.x).toBeLessThan(5) // near left edge with padding

        // s2 should be in center third (x > ~30%)
        const s2Box = boundingBox(result.sectionLayouts[1].polygon)
        expect(s2Box.x).toBeGreaterThan(25)
        expect(s2Box.x).toBeLessThan(45)

        // s3 should be in right third (x > ~60%)
        const s3Box = boundingBox(result.sectionLayouts[2].polygon)
        expect(s3Box.x).toBeGreaterThan(55)
    })

    it('stacks multiple sections vertically within a panel', () => {
        const sections = [makeSection('s1', 2), makeSection('s2', 2)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: {
                'inside-left': ['s1', 's2'],
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.sectionLayouts).toHaveLength(2)

        const s1Box = boundingBox(result.sectionLayouts[0].polygon)
        const s2Box = boundingBox(result.sectionLayouts[1].polygon)
        // s2 should be below s1
        expect(s2Box.y).toBeGreaterThan(s1Box.y)
    })

    it('always returns pageCount: 2', () => {
        const sections = [makeSection('s1', 2)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: { 'inside-left': ['s1'] },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.pageCount).toBe(2)
    })

    it('gate-fold center panel is wider than letter-fold center panel', () => {
        const sections = [makeSection('s1', 2)]
        const gateLayout = makeTriFoldPageLayout({
            foldType: 'gate-fold',
            panelSections: { 'inside-center': ['s1'] },
        })
        const letterLayout = makeTriFoldPageLayout({
            foldType: 'letter-fold',
            panelSections: { 'inside-center': ['s1'] },
        })
        const gateResult = computeTriFoldLayout({
            sections, pageLayout: gateLayout, menuData: makeMenuData(sections),
        })
        const letterResult = computeTriFoldLayout({
            sections, pageLayout: letterLayout, menuData: makeMenuData(sections),
        })
        const gateBox = boundingBox(gateResult.sectionLayouts[0].polygon)
        const letterBox = boundingBox(letterResult.sectionLayouts[0].polygon)
        expect(gateBox.width).toBeGreaterThan(letterBox.width)
    })

    it('z-fold produces equal-width left and right panels', () => {
        const sections = [makeSection('s1', 2), makeSection('s2', 2), makeSection('s3', 2)]
        const pageLayout = makeTriFoldPageLayout({
            foldType: 'z-fold',
            panelSections: {
                'inside-left': ['s1'],
                'inside-center': ['s2'],
                'inside-right': ['s3'],
            },
        })
        const result = computeTriFoldLayout({
            sections, pageLayout, menuData: makeMenuData(sections),
        })
        const widths = result.sectionLayouts.map(sl => boundingBox(sl.polygon).width)
        // Left and right panels should be equal width (margins eat symmetrically)
        expect(widths[0]).toBeCloseTo(widths[2], 1)
        // All panels should have positive width
        for (const w of widths) {
            expect(w).toBeGreaterThan(0)
        }
    })

    it('splits a large section across panels (produces startItemIndex/endItemIndex)', () => {
        // Create a section with many items that won't fit in one panel
        const sections = [makeSection('big', 30)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: {
                'inside-left': ['big'],
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        // Should produce multiple layout fragments for the same section
        const bigLayouts = result.sectionLayouts.filter(l => l.sectionId === 'big')
        expect(bigLayouts.length).toBeGreaterThanOrEqual(2)

        // First fragment should have endItemIndex set
        const firstFrag = bigLayouts[0]
        expect(firstFrag.endItemIndex).toBeDefined()
        expect(firstFrag.endItemIndex).toBeGreaterThan(0)
        expect(firstFrag.endItemIndex).toBeLessThan(30)

        // Second fragment should have startItemIndex matching first's endItemIndex
        const secondFrag = bigLayouts[1]
        expect(secondFrag.startItemIndex).toBe(firstFrag.endItemIndex)
    })

    it('flows content sequentially across panels (column flow)', () => {
        // Put lots of content in inside-left — should flow to inside-center, inside-right, etc.
        const sections = [makeSection('big', 30)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: {
                'inside-left': ['big'],
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        const bigLayouts = result.sectionLayouts.filter(l => l.sectionId === 'big')
        // Should have fragments on at least 2 different panels (different x positions or pages)
        const uniquePositions = new Set(bigLayouts.map(l => {
            const box = boundingBox(l.polygon)
            return `${l.pageIndex}-${box.x.toFixed(1)}`
        }))
        expect(uniquePositions.size).toBeGreaterThanOrEqual(2)

        // Fragments should be in sequential panel order (left-to-right)
        for (let i = 1; i < bigLayouts.length; i++) {
            const prevBox = boundingBox(bigLayouts[i - 1].polygon)
            const currBox = boundingBox(bigLayouts[i].polygon)
            // Next fragment should be to the right OR on a different page
            const progresses = currBox.x > prevBox.x || bigLayouts[i].pageIndex !== bigLayouts[i - 1].pageIndex
            expect(progresses).toBe(true)
        }
    })

    it('flows multiple sections sequentially across panels', () => {
        // All sections start in inside-left, should flow left-to-right
        const sections = [makeSection('s1', 10), makeSection('s2', 10), makeSection('s3', 10)]
        const pageLayout = makeTriFoldPageLayout({
            panelSections: {
                'inside-left': ['s1', 's2', 's3'],
            },
        })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        // All sections should have layouts
        expect(result.sectionLayouts.some(l => l.sectionId === 's1')).toBe(true)
        expect(result.sectionLayouts.some(l => l.sectionId === 's2')).toBe(true)
        expect(result.sectionLayouts.some(l => l.sectionId === 's3')).toBe(true)
    })

    it('always uses fontScale 1.0 (no auto font scaling for flow layout)', () => {
        // Even with lots of content, flow layout doesn't auto-shrink fonts
        const sections = Array.from({ length: 5 }, (_, i) => makeSection(`s${i}`, 25))
        const panelSections: Record<string, string[]> = {
            'inside-left': ['s0', 's1', 's2', 's3', 's4'],
        }
        const pageLayout = makeTriFoldPageLayout({ panelSections })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.fontScale).toBe(1.0)
    })

    it('sets overflow when content exceeds all 5 panels', () => {
        const sections = Array.from({ length: 5 }, (_, i) => makeSection(`s${i}`, 25))
        const panelSections: Record<string, string[]> = {
            'inside-left': ['s0', 's1', 's2', 's3', 's4'],
        }
        const pageLayout = makeTriFoldPageLayout({ panelSections })
        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: makeMenuData(sections),
        })
        expect(result.overflow).toBe(true)
    })

    it('places all 27 items from Alary\'s menu across panels (real fixture)', () => {
        // Load the actual Alary's fixture data
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fixture = require('../../../../tests/e2e/fixtures/alarys-main.json')
        const sections: MenuSection[] = fixture.menuData.sections

        // Verify fixture has expected data
        expect(sections).toHaveLength(4)
        const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
        expect(totalItems).toBe(27)

        // Set up tri-fold layout with height-aware distribution
        const sectionIds = sections.map(s => s.id)
        const baseLayout = makeTriFoldPageLayout()
        const pageLayout = makeTriFoldPageLayout({
            panelSections: autoDistributeTriFold(sectionIds, sections, baseLayout),
        })

        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: fixture.menuData,
        })

        // Count all items covered by the layout fragments
        let placedItemCount = 0
        for (const layout of result.sectionLayouts) {
            const section = sections.find(s => s.id === layout.sectionId)!
            const items = section.items.filter(item => item.isAvailable !== false)
            const start = layout.startItemIndex ?? 0
            const end = layout.endItemIndex ?? items.length
            placedItemCount += (end - start)
        }

        // ALL 27 items must be placed — zero missing
        expect(placedItemCount).toBe(27)

        // Should use multiple panels (not all crammed into one)
        const uniquePanelPositions = new Set(
            result.sectionLayouts.map(l => `${l.pageIndex}-${boundingBox(l.polygon).x.toFixed(1)}`)
        )
        expect(uniquePanelPositions.size).toBeGreaterThanOrEqual(2)

        // Should split at least one section (27 items can't fit in one panel)
        const sectionFragmentCounts = new Map<string, number>()
        for (const l of result.sectionLayouts) {
            sectionFragmentCounts.set(l.sectionId, (sectionFragmentCounts.get(l.sectionId) ?? 0) + 1)
        }
        const hasSplitSection = Array.from(sectionFragmentCounts.values()).some(count => count > 1)
        expect(hasSplitSection).toBe(true)

        // Verify no gaps in item coverage per section
        for (const section of sections) {
            const fragments = result.sectionLayouts
                .filter(l => l.sectionId === section.id)
                .sort((a, b) => (a.startItemIndex ?? 0) - (b.startItemIndex ?? 0))
            const items = section.items.filter(item => item.isAvailable !== false)

            if (fragments.length === 0) continue
            // First fragment starts at 0
            expect(fragments[0].startItemIndex ?? 0).toBe(0)
            // Last fragment ends at total items
            expect(fragments[fragments.length - 1].endItemIndex ?? items.length).toBe(items.length)
            // Adjacent fragments are contiguous
            for (let i = 1; i < fragments.length; i++) {
                const prevEnd = fragments[i - 1].endItemIndex ?? items.length
                const currStart = fragments[i].startItemIndex ?? 0
                expect(currStart).toBe(prevEnd)
            }
        }
    })

    it('uses both pages when content overflows inside panels (Alary\'s fixture)', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fixture = require('../../../../tests/e2e/fixtures/alarys-main.json')
        const sections: MenuSection[] = fixture.menuData.sections
        const sectionIds = sections.map(s => s.id)
        const baseLayout = makeTriFoldPageLayout()
        const pageLayout = makeTriFoldPageLayout({
            panelSections: autoDistributeTriFold(sectionIds, sections, baseLayout),
        })

        const result = computeTriFoldLayout({
            sections,
            pageLayout,
            menuData: fixture.menuData,
        })

        // Check which pages have content
        const pagesUsed = new Set(result.sectionLayouts.map(l => l.pageIndex))

        // With 27 items (APPS 10, SALADS 4, HANDHELDS 11, PASTAS 2),
        // content should flow from inside panels (page 1) to front panels (page 0)
        // if it overflows the 3 inside panels
        expect(pagesUsed.has(1)).toBe(true) // Inside panels always have content

        // Count items per page
        let page0Items = 0
        let page1Items = 0
        for (const layout of result.sectionLayouts) {
            const section = sections.find(s => s.id === layout.sectionId)!
            const items = section.items.filter(item => item.isAvailable !== false)
            const start = layout.startItemIndex ?? 0
            const end = layout.endItemIndex ?? items.length
            const count = end - start
            if (layout.pageIndex === 0) page0Items += count
            else page1Items += count
        }

        // Total should still be 27
        expect(page0Items + page1Items).toBe(27)
    })

    it('balanced distribution produces fewer fragments than all-in-inside-left (Alary\'s fixture)', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fixture = require('../../../../tests/e2e/fixtures/alarys-main.json')
        const sections: MenuSection[] = fixture.menuData.sections
        const sectionIds = sections.map(s => s.id)

        // Unbalanced: all in inside-left (old behavior)
        const unbalancedLayout = makeTriFoldPageLayout({
            panelSections: { 'inside-left': [...sectionIds] },
        })
        const unbalancedResult = computeTriFoldLayout({
            sections, pageLayout: unbalancedLayout, menuData: fixture.menuData,
        })

        // Balanced: height-aware distribution
        const baseLayout = makeTriFoldPageLayout()
        const balancedLayout = makeTriFoldPageLayout({
            panelSections: autoDistributeTriFold(sectionIds, sections, baseLayout),
        })
        const balancedResult = computeTriFoldLayout({
            sections, pageLayout: balancedLayout, menuData: fixture.menuData,
        })

        // Both should place all 27 items
        const countItems = (layouts: typeof unbalancedResult.sectionLayouts) => {
            let count = 0
            for (const l of layouts) {
                const sec = sections.find(s => s.id === l.sectionId)!
                const items = sec.items.filter(item => item.isAvailable !== false)
                count += (l.endItemIndex ?? items.length) - (l.startItemIndex ?? 0)
            }
            return count
        }
        expect(countItems(unbalancedResult.sectionLayouts)).toBe(27)
        expect(countItems(balancedResult.sectionLayouts)).toBe(27)

        // Balanced should produce fewer or equal fragments (fewer splits)
        expect(balancedResult.sectionLayouts.length).toBeLessThanOrEqual(unbalancedResult.sectionLayouts.length)
    })
})
