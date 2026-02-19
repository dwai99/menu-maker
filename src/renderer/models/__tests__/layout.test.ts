import { describe, it, expect } from 'vitest'
import {
    createDefaultFontStyle,
    createDefaultTypography,
    createDefaultColorScheme,
    createDefaultPageLayout,
    PAGE_SIZES,
} from '../layout'
import type { PageSizeId } from '../layout'

describe('Layout Models', () => {
    // ── PAGE_SIZES ────────────────────────────────────────────
    describe('PAGE_SIZES', () => {
        const sizes: PageSizeId[] = ['letter', 'legal', 'half-letter', 'a4', 'a5', 'table-tent', 'tri-fold']

        it('should define all expected page sizes', () => {
            for (const size of sizes) {
                expect(PAGE_SIZES[size]).toBeDefined()
            }
        })

        it('should have positive dimensions for all sizes', () => {
            for (const size of sizes) {
                expect(PAGE_SIZES[size].width).toBeGreaterThan(0)
                expect(PAGE_SIZES[size].height).toBeGreaterThan(0)
            }
        })

        it('should have a label for all sizes', () => {
            for (const size of sizes) {
                expect(PAGE_SIZES[size].label).toBeTruthy()
            }
        })

        it('letter should be 8.5x11', () => {
            expect(PAGE_SIZES.letter.width).toBe(8.5)
            expect(PAGE_SIZES.letter.height).toBe(11)
        })

        it('a4 should be close to 210x297mm', () => {
            expect(PAGE_SIZES.a4.width).toBeCloseTo(8.27, 1)
            expect(PAGE_SIZES.a4.height).toBeCloseTo(11.69, 1)
        })
    })

    // ── createDefaultFontStyle ────────────────────────────────
    describe('createDefaultFontStyle', () => {
        it('should return valid defaults', () => {
            const font = createDefaultFontStyle()
            expect(font.fontFamily).toBe('system-ui')
            expect(font.fontSize).toBe(12)
            expect(font.fontWeight).toBe(400)
            expect(font.textTransform).toBe('none')
            expect(font.textAlign).toBe('left')
        })

        it('should allow overrides', () => {
            const font = createDefaultFontStyle({ fontSize: 24, fontWeight: 700 })
            expect(font.fontSize).toBe(24)
            expect(font.fontWeight).toBe(700)
            // Non-overridden fields stay default
            expect(font.fontFamily).toBe('system-ui')
        })

        it('should override multiple fields simultaneously', () => {
            const font = createDefaultFontStyle({
                fontFamily: 'Georgia',
                fontSize: 28,
                fontWeight: 700,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 0.1,
                lineHeight: 1.2,
                color: '#ff0000',
            })
            expect(font.fontFamily).toBe('Georgia')
            expect(font.textAlign).toBe('center')
            expect(font.textTransform).toBe('uppercase')
            expect(font.color).toBe('#ff0000')
        })
    })

    // ── createDefaultTypography ───────────────────────────────
    describe('createDefaultTypography', () => {
        it('should define all typography roles', () => {
            const typo = createDefaultTypography()
            expect(typo.menuTitle).toBeDefined()
            expect(typo.menuSubtitle).toBeDefined()
            expect(typo.sectionTitle).toBeDefined()
            expect(typo.sectionSubtitle).toBeDefined()
            expect(typo.itemName).toBeDefined()
            expect(typo.itemDescription).toBeDefined()
            expect(typo.itemPrice).toBeDefined()
            expect(typo.footer).toBeDefined()
        })

        it('should have larger font for menu title', () => {
            const typo = createDefaultTypography()
            expect(typo.menuTitle.fontSize).toBeGreaterThan(typo.itemName.fontSize)
        })

        it('should have centered menu title', () => {
            const typo = createDefaultTypography()
            expect(typo.menuTitle.textAlign).toBe('center')
        })

        it('should have bold item names', () => {
            const typo = createDefaultTypography()
            expect(typo.itemName.fontWeight).toBe(700)
        })

        it('should have right-aligned item price', () => {
            const typo = createDefaultTypography()
            expect(typo.itemPrice.textAlign).toBe('right')
        })
    })

    // ── createDefaultColorScheme ──────────────────────────────
    describe('createDefaultColorScheme', () => {
        it('should return valid hex colors', () => {
            const scheme = createDefaultColorScheme()
            expect(scheme.background).toMatch(/^#[0-9a-fA-F]{3,8}$/)
            expect(scheme.text).toMatch(/^#[0-9a-fA-F]{3,8}$/)
            expect(scheme.accent).toMatch(/^#[0-9a-fA-F]{3,8}$/)
            expect(scheme.border).toMatch(/^#[0-9a-fA-F]{3,8}$/)
        })

        it('should have all 4 required color keys', () => {
            const scheme = createDefaultColorScheme()
            expect(Object.keys(scheme)).toEqual(
                expect.arrayContaining(['background', 'text', 'accent', 'border'])
            )
        })
    })

    // ── createDefaultPageLayout ───────────────────────────────
    describe('createDefaultPageLayout', () => {
        it('should default to letter + portrait', () => {
            const layout = createDefaultPageLayout()
            expect(layout.pageSize).toBe('letter')
            expect(layout.orientation).toBe('portrait')
        })

        it('should have 0.75in margins on all sides', () => {
            const layout = createDefaultPageLayout()
            expect(layout.margins).toEqual({
                top: 0.75,
                right: 0.75,
                bottom: 0.75,
                left: 0.75,
            })
        })

        it('should default to single column', () => {
            const layout = createDefaultPageLayout()
            expect(layout.columnCount).toBe(1)
        })

        it('should default to no section layouts', () => {
            const layout = createDefaultPageLayout()
            expect(layout.sectionLayouts).toEqual([])
        })

        it('should default to no decorations/textures', () => {
            const layout = createDefaultPageLayout()
            expect(layout.itemSeparator).toBe('none')
            expect(layout.sectionDecoration).toBe('none')
            expect(layout.backgroundTexture).toBe('none')
            expect(layout.sectionDivider).toBe('none')
            expect(layout.pageBorder).toBe('none')
        })

        it('should default to USD currency', () => {
            const layout = createDefaultPageLayout()
            expect(layout.currency).toBe('$')
        })

        it('should have no pages by default (single page mode)', () => {
            const layout = createDefaultPageLayout()
            expect(layout.pages).toBeUndefined()
        })

        it('should include typography and color scheme', () => {
            const layout = createDefaultPageLayout()
            expect(layout.typography).toBeDefined()
            expect(layout.colorScheme).toBeDefined()
        })
    })
})
