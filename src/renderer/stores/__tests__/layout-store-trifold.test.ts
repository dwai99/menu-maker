import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '../layout-store'
import { act } from '@testing-library/react'

/**
 * Tests for layout-store actions not covered elsewhere:
 * - enableTriFold / disableTriFold
 * - setTriFoldType
 * - setTriFoldPaperSize
 * - setTriFoldPanelSections
 * - updateTriFoldConfig
 * - setHeaderConfig
 * - setHeaderHeight
 * - setSectionTitleDecoration
 * - setPrintMarks
 * - setShowDietaryLegend
 * - setVariantDisplayMode / setVariantSeparator
 * - setSectionDecorations
 * - undo/redo via temporal middleware
 */

describe('Layout Store - Tri-fold, Header, and Undo/Redo', () => {
    beforeEach(() => {
        act(() => {
            useLayoutStore.getState().reset()
            useLayoutStore.temporal.getState().clear()
        })
    })

    // ── Tri-fold: enable/disable ───────────────────────────────
    describe('enableTriFold / disableTriFold', () => {
        it('should enable tri-fold mode', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            const { triFold } = useLayoutStore.getState().pageLayout
            expect(triFold).toBeDefined()
            expect(triFold!.enabled).toBe(true)
        })

        it('should default to letter paper size when enabling', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            const { triFold } = useLayoutStore.getState().pageLayout
            expect(triFold!.paperSize).toBe('letter')
        })

        it('should use the specified paper size when enabling', () => {
            act(() => useLayoutStore.getState().enableTriFold('legal'))
            const { triFold } = useLayoutStore.getState().pageLayout
            expect(triFold!.paperSize).toBe('legal')
        })

        it('should set page size to match paper size on enable', () => {
            act(() => useLayoutStore.getState().enableTriFold('letter'))
            expect(useLayoutStore.getState().pageLayout.pageSize).toBe('letter')
        })

        it('should set orientation to landscape on enable', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            expect(useLayoutStore.getState().pageLayout.orientation).toBe('landscape')
        })

        it('should default to letter-fold type', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            expect(useLayoutStore.getState().pageLayout.triFold!.foldType).toBe('letter-fold')
        })

        it('should initialize empty panel sections', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            expect(useLayoutStore.getState().pageLayout.triFold!.panelSections).toEqual({})
        })

        it('should enable cover, subtitle, logo, and footer visibility by default', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            const tf = useLayoutStore.getState().pageLayout.triFold!
            expect(tf.coverShowTitle).toBe(true)
            expect(tf.coverShowSubtitle).toBe(true)
            expect(tf.coverShowLogo).toBe(true)
            expect(tf.backShowFooter).toBe(true)
        })

        it('should disable tri-fold mode', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            act(() => useLayoutStore.getState().disableTriFold())
            expect(useLayoutStore.getState().pageLayout.triFold).toBeUndefined()
        })
    })

    // ── Tri-fold: setTriFoldType ───────────────────────────────
    describe('setTriFoldType', () => {
        beforeEach(() => {
            act(() => useLayoutStore.getState().enableTriFold())
        })

        it('should set fold type to z-fold', () => {
            act(() => useLayoutStore.getState().setTriFoldType('z-fold'))
            expect(useLayoutStore.getState().pageLayout.triFold!.foldType).toBe('z-fold')
        })

        it('should set fold type to gate-fold', () => {
            act(() => useLayoutStore.getState().setTriFoldType('gate-fold'))
            expect(useLayoutStore.getState().pageLayout.triFold!.foldType).toBe('gate-fold')
        })

        it('should set fold type back to letter-fold', () => {
            act(() => useLayoutStore.getState().setTriFoldType('z-fold'))
            act(() => useLayoutStore.getState().setTriFoldType('letter-fold'))
            expect(useLayoutStore.getState().pageLayout.triFold!.foldType).toBe('letter-fold')
        })

        it('should be a no-op when triFold is not enabled', () => {
            act(() => useLayoutStore.getState().disableTriFold())
            act(() => useLayoutStore.getState().setTriFoldType('z-fold'))
            expect(useLayoutStore.getState().pageLayout.triFold).toBeUndefined()
        })
    })

    // ── Tri-fold: setTriFoldPaperSize ─────────────────────────
    describe('setTriFoldPaperSize', () => {
        beforeEach(() => {
            act(() => useLayoutStore.getState().enableTriFold('letter'))
        })

        it('should update paper size to legal', () => {
            act(() => useLayoutStore.getState().setTriFoldPaperSize('legal'))
            expect(useLayoutStore.getState().pageLayout.triFold!.paperSize).toBe('legal')
        })

        it('should update pageLayout.pageSize when changing tri-fold paper size', () => {
            act(() => useLayoutStore.getState().setTriFoldPaperSize('legal'))
            expect(useLayoutStore.getState().pageLayout.pageSize).toBe('legal')
        })
    })

    // ── Tri-fold: setTriFoldPanelSections ─────────────────────
    describe('setTriFoldPanelSections', () => {
        beforeEach(() => {
            act(() => useLayoutStore.getState().enableTriFold())
        })

        it('should assign sections to a panel', () => {
            act(() => useLayoutStore.getState().setTriFoldPanelSections('inside-left', ['sec-1', 'sec-2']))
            const panels = useLayoutStore.getState().pageLayout.triFold!.panelSections
            expect(panels['inside-left']).toEqual(['sec-1', 'sec-2'])
        })

        it('should overwrite existing sections for a panel', () => {
            act(() => useLayoutStore.getState().setTriFoldPanelSections('cover', ['sec-1']))
            act(() => useLayoutStore.getState().setTriFoldPanelSections('cover', ['sec-2', 'sec-3']))
            const panels = useLayoutStore.getState().pageLayout.triFold!.panelSections
            expect(panels['cover']).toEqual(['sec-2', 'sec-3'])
        })

        it('should independently set sections for different panels', () => {
            act(() => useLayoutStore.getState().setTriFoldPanelSections('inside-left', ['sec-1']))
            act(() => useLayoutStore.getState().setTriFoldPanelSections('inside-right', ['sec-2']))
            const panels = useLayoutStore.getState().pageLayout.triFold!.panelSections
            expect(panels['inside-left']).toEqual(['sec-1'])
            expect(panels['inside-right']).toEqual(['sec-2'])
        })

        it('should be a no-op when triFold is not enabled', () => {
            act(() => useLayoutStore.getState().disableTriFold())
            act(() => useLayoutStore.getState().setTriFoldPanelSections('cover', ['sec-1']))
            expect(useLayoutStore.getState().pageLayout.triFold).toBeUndefined()
        })
    })

    // ── Tri-fold: updateTriFoldConfig ─────────────────────────
    describe('updateTriFoldConfig', () => {
        beforeEach(() => {
            act(() => useLayoutStore.getState().enableTriFold())
        })

        it('should update coverShowTitle', () => {
            act(() => useLayoutStore.getState().updateTriFoldConfig({ coverShowTitle: false }))
            expect(useLayoutStore.getState().pageLayout.triFold!.coverShowTitle).toBe(false)
        })

        it('should update coverShowLogo', () => {
            act(() => useLayoutStore.getState().updateTriFoldConfig({ coverShowLogo: false }))
            expect(useLayoutStore.getState().pageLayout.triFold!.coverShowLogo).toBe(false)
        })

        it('should update backShowFooter', () => {
            act(() => useLayoutStore.getState().updateTriFoldConfig({ backShowFooter: false }))
            expect(useLayoutStore.getState().pageLayout.triFold!.backShowFooter).toBe(false)
        })

        it('should set backCustomText', () => {
            act(() => useLayoutStore.getState().updateTriFoldConfig({ backCustomText: 'Thank you!' }))
            expect(useLayoutStore.getState().pageLayout.triFold!.backCustomText).toBe('Thank you!')
        })

        it('should merge partial updates without overwriting other fields', () => {
            act(() => useLayoutStore.getState().updateTriFoldConfig({ coverShowTitle: false }))
            // Other fields should remain
            expect(useLayoutStore.getState().pageLayout.triFold!.coverShowLogo).toBe(true)
            expect(useLayoutStore.getState().pageLayout.triFold!.backShowFooter).toBe(true)
        })

        it('should be a no-op when triFold is not enabled', () => {
            act(() => useLayoutStore.getState().disableTriFold())
            act(() => useLayoutStore.getState().updateTriFoldConfig({ coverShowTitle: false }))
            expect(useLayoutStore.getState().pageLayout.triFold).toBeUndefined()
        })
    })

    // ── setHeaderConfig ───────────────────────────────────────
    describe('setHeaderConfig', () => {
        it('should set header config preset', () => {
            act(() => useLayoutStore.getState().setHeaderConfig({ preset: 'left-logo' }))
            expect(useLayoutStore.getState().pageLayout.headerConfig?.preset).toBe('left-logo')
        })

        it('should set header showDivider', () => {
            act(() => useLayoutStore.getState().setHeaderConfig({ showDivider: false }))
            expect(useLayoutStore.getState().pageLayout.headerConfig?.showDivider).toBe(false)
        })

        it('should set header logoScale', () => {
            act(() => useLayoutStore.getState().setHeaderConfig({ logoScale: 1.5 }))
            expect(useLayoutStore.getState().pageLayout.headerConfig?.logoScale).toBe(1.5)
        })

        it('should merge with existing header config (not replace)', () => {
            act(() => useLayoutStore.getState().setHeaderConfig({ preset: 'right-logo' }))
            act(() => useLayoutStore.getState().setHeaderConfig({ showDivider: false }))
            const headerConfig = useLayoutStore.getState().pageLayout.headerConfig
            expect(headerConfig?.preset).toBe('right-logo')
            expect(headerConfig?.showDivider).toBe(false)
        })

        it('should use defaults if headerConfig not yet set', () => {
            // Reset ensures no headerConfig is set
            act(() => useLayoutStore.getState().reset())
            act(() => useLayoutStore.getState().setHeaderConfig({ logoScale: 2.0 }))
            const headerConfig = useLayoutStore.getState().pageLayout.headerConfig
            expect(headerConfig?.logoScale).toBe(2.0)
            // Default preset should be 'centered-stack'
            expect(headerConfig?.preset).toBe('centered-stack')
        })
    })

    // ── setHeaderHeight ───────────────────────────────────────
    describe('setHeaderHeight', () => {
        it('should set header height', () => {
            act(() => useLayoutStore.getState().setHeaderHeight(200))
            expect(useLayoutStore.getState().pageLayout.headerHeight).toBe(200)
        })

        it('should set header height to 0 (auto)', () => {
            act(() => useLayoutStore.getState().setHeaderHeight(120))
            act(() => useLayoutStore.getState().setHeaderHeight(0))
            expect(useLayoutStore.getState().pageLayout.headerHeight).toBe(0)
        })

        it('should allow various header height values', () => {
            const heights = [80, 120, 160, 240]
            for (const height of heights) {
                act(() => useLayoutStore.getState().setHeaderHeight(height))
                expect(useLayoutStore.getState().pageLayout.headerHeight).toBe(height)
            }
        })
    })

    // ── setSectionTitleDecoration ─────────────────────────────
    describe('setSectionTitleDecoration', () => {
        it('should set section title decoration to underline-solid', () => {
            act(() => useLayoutStore.getState().setSectionTitleDecoration('underline-solid'))
            expect(useLayoutStore.getState().pageLayout.sectionTitleDecoration).toBe('underline-solid')
        })

        it('should set section title decoration to ornamental-flourish', () => {
            act(() => useLayoutStore.getState().setSectionTitleDecoration('ornamental-flourish'))
            expect(useLayoutStore.getState().pageLayout.sectionTitleDecoration).toBe('ornamental-flourish')
        })

        it('should set all supported decoration types', () => {
            const decorations = [
                'none',
                'underline-solid',
                'underline-double',
                'ornamental-flourish',
                'ornamental-lines',
                'ornamental-diamond',
            ] as const
            for (const dec of decorations) {
                act(() => useLayoutStore.getState().setSectionTitleDecoration(dec))
                expect(useLayoutStore.getState().pageLayout.sectionTitleDecoration).toBe(dec)
            }
        })
    })

    // ── setPrintMarks ─────────────────────────────────────────
    describe('setPrintMarks', () => {
        it('should enable crop marks', () => {
            act(() => useLayoutStore.getState().setPrintMarks({ showCropMarks: true }))
            expect(useLayoutStore.getState().pageLayout.printMarks?.showCropMarks).toBe(true)
        })

        it('should enable registration marks', () => {
            act(() => useLayoutStore.getState().setPrintMarks({ showRegistrationMarks: true }))
            expect(useLayoutStore.getState().pageLayout.printMarks?.showRegistrationMarks).toBe(true)
        })

        it('should set bleed value', () => {
            act(() => useLayoutStore.getState().setPrintMarks({ bleed: 0.25 }))
            expect(useLayoutStore.getState().pageLayout.printMarks?.bleed).toBe(0.25)
        })

        it('should merge print marks without overwriting others', () => {
            act(() => useLayoutStore.getState().setPrintMarks({ showCropMarks: true }))
            act(() => useLayoutStore.getState().setPrintMarks({ showRegistrationMarks: true }))
            const marks = useLayoutStore.getState().pageLayout.printMarks!
            expect(marks.showCropMarks).toBe(true)
            expect(marks.showRegistrationMarks).toBe(true)
        })
    })

    // ── setShowDietaryLegend ──────────────────────────────────
    describe('setShowDietaryLegend', () => {
        it('should enable dietary legend', () => {
            act(() => useLayoutStore.getState().setShowDietaryLegend(true))
            expect(useLayoutStore.getState().pageLayout.showDietaryLegend).toBe(true)
        })

        it('should disable dietary legend', () => {
            act(() => useLayoutStore.getState().setShowDietaryLegend(true))
            act(() => useLayoutStore.getState().setShowDietaryLegend(false))
            expect(useLayoutStore.getState().pageLayout.showDietaryLegend).toBe(false)
        })
    })

    // ── setVariantDisplayMode and setVariantSeparator ─────────
    describe('variant display', () => {
        it('should set variant display mode to stacked', () => {
            act(() => useLayoutStore.getState().setVariantDisplayMode('stacked'))
            expect(useLayoutStore.getState().pageLayout.variantDisplayMode).toBe('stacked')
        })

        it('should set variant display mode to inline', () => {
            act(() => useLayoutStore.getState().setVariantDisplayMode('inline'))
            expect(useLayoutStore.getState().pageLayout.variantDisplayMode).toBe('inline')
        })

        it('should set variant separator to slash', () => {
            act(() => useLayoutStore.getState().setVariantSeparator('/'))
            expect(useLayoutStore.getState().pageLayout.variantSeparator).toBe('/')
        })

        it('should set all variant separators', () => {
            const separators = ['/', '·', '|', '—'] as const
            for (const sep of separators) {
                act(() => useLayoutStore.getState().setVariantSeparator(sep))
                expect(useLayoutStore.getState().pageLayout.variantSeparator).toBe(sep)
            }
        })
    })

    // ── setSectionDecorations (array) ─────────────────────────
    describe('setSectionDecorations', () => {
        it('should set an array of section decorations', () => {
            act(() => useLayoutStore.getState().setSectionDecorations(['border', 'shadow']))
            expect(useLayoutStore.getState().pageLayout.sectionDecorations).toEqual(['border', 'shadow'])
        })

        it('should clear section decorations with empty array', () => {
            act(() => useLayoutStore.getState().setSectionDecorations(['border']))
            act(() => useLayoutStore.getState().setSectionDecorations([]))
            expect(useLayoutStore.getState().pageLayout.sectionDecorations).toEqual([])
        })
    })

    // ── Undo/Redo for layout store ────────────────────────────
    describe('undo/redo', () => {
        it('should undo setPageSize', () => {
            const originalSize = useLayoutStore.getState().pageLayout.pageSize
            act(() => useLayoutStore.getState().setPageSize('a4'))
            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.pageSize).toBe(originalSize)
        })

        it('should redo setPageSize after undo', () => {
            act(() => useLayoutStore.getState().setPageSize('a4'))
            act(() => useLayoutStore.temporal.getState().undo())
            act(() => useLayoutStore.temporal.getState().redo())
            expect(useLayoutStore.getState().pageLayout.pageSize).toBe('a4')
        })

        it('should undo setOrientation', () => {
            const original = useLayoutStore.getState().pageLayout.orientation
            act(() => useLayoutStore.getState().setOrientation('landscape'))
            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.orientation).toBe(original)
        })

        it('should undo setColumnCount', () => {
            const original = useLayoutStore.getState().pageLayout.columnCount
            act(() => useLayoutStore.getState().setColumnCount(3))
            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.columnCount).toBe(original)
        })

        it('should undo setColorScheme', () => {
            const originalAccent = useLayoutStore.getState().pageLayout.colorScheme.accent
            act(() => useLayoutStore.getState().setColorScheme({ accent: '#ff0000' }))
            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.colorScheme.accent).toBe(originalAccent)
        })

        it('should undo enableTriFold', () => {
            act(() => useLayoutStore.getState().enableTriFold())
            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.triFold).toBeUndefined()
        })

        it('should support multiple undo steps', () => {
            act(() => useLayoutStore.getState().setPageSize('a4'))
            act(() => useLayoutStore.getState().setPageSize('a5'))
            act(() => useLayoutStore.getState().setPageSize('legal'))

            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.pageSize).toBe('a5')

            act(() => useLayoutStore.temporal.getState().undo())
            expect(useLayoutStore.getState().pageLayout.pageSize).toBe('a4')
        })

        it('should not crash when there is nothing to undo', () => {
            act(() => useLayoutStore.temporal.getState().clear())
            expect(() => {
                act(() => useLayoutStore.temporal.getState().undo())
            }).not.toThrow()
        })

        it('should not crash when there is nothing to redo', () => {
            expect(() => {
                act(() => useLayoutStore.temporal.getState().redo())
            }).not.toThrow()
        })
    })
})
