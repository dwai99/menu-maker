import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '../layout-store'
import { act } from '@testing-library/react'

/**
 * Advanced tests for layout-store operations:
 * section layouts, polygon editing, multi-page management
 */

describe('Layout Store - Advanced Operations', () => {
    beforeEach(() => {
        act(() => useLayoutStore.getState().reset())
    })

    // ── Color Scheme ──────────────────────────────────────────
    describe('setColorScheme', () => {
        it('should merge partial color scheme', () => {
            act(() => useLayoutStore.getState().setColorScheme({ accent: '#ff0000' }))
            const scheme = useLayoutStore.getState().pageLayout.colorScheme
            expect(scheme.accent).toBe('#ff0000')
            // Other colors should remain
            expect(scheme.background).toBe('#FFFFFF')
        })

        it('should override multiple colors', () => {
            act(() => useLayoutStore.getState().setColorScheme({ background: '#000', text: '#fff' }))
            const scheme = useLayoutStore.getState().pageLayout.colorScheme
            expect(scheme.background).toBe('#000')
            expect(scheme.text).toBe('#fff')
        })
    })

    // ── Typography ────────────────────────────────────────────
    describe('setTypography', () => {
        it('should update a specific typography role', () => {
            act(() => useLayoutStore.getState().setTypography('menuTitle', { fontSize: 36 }))
            expect(useLayoutStore.getState().pageLayout.typography.menuTitle.fontSize).toBe(36)
        })

        it('should merge with existing font style', () => {
            act(() => useLayoutStore.getState().setTypography('itemName', { fontWeight: 900, fontSize: 16 }))
            const style = useLayoutStore.getState().pageLayout.typography.itemName
            expect(style.fontWeight).toBe(900)
            expect(style.fontSize).toBe(16)
            // fontFamily should remain
            expect(style.fontFamily).toBeTruthy()
        })
    })

    // ── Layout Direction, Item Separator, Price Format ────────
    describe('Layout options', () => {
        it('should set layout direction', () => {
            act(() => useLayoutStore.getState().updateLayout('layoutDirection', 'horizontal'))
            expect(useLayoutStore.getState().pageLayout.layoutDirection).toBe('horizontal')
        })

        it('should set item separator', () => {
            act(() => useLayoutStore.getState().updateLayout('itemSeparator', 'dots'))
            expect(useLayoutStore.getState().pageLayout.itemSeparator).toBe('dots')
        })

        it('should set price format', () => {
            act(() => useLayoutStore.getState().updateLayout('priceFormat', 'dot-leaders'))
            expect(useLayoutStore.getState().pageLayout.priceFormat).toBe('dot-leaders')
        })

        it('should set section decoration', () => {
            act(() => useLayoutStore.getState().updateLayout('sectionDecoration', 'border'))
            expect(useLayoutStore.getState().pageLayout.sectionDecoration).toBe('border')
        })

        it('should set currency', () => {
            act(() => useLayoutStore.getState().updateLayout('currency', '€'))
            expect(useLayoutStore.getState().pageLayout.currency).toBe('€')
        })

        it('should set background texture', () => {
            act(() => useLayoutStore.getState().updateLayout('backgroundTexture', 'parchment'))
            expect(useLayoutStore.getState().pageLayout.backgroundTexture).toBe('parchment')
        })

        it('should set section divider', () => {
            act(() => useLayoutStore.getState().updateLayout('sectionDivider', 'flourish'))
            expect(useLayoutStore.getState().pageLayout.sectionDivider).toBe('flourish')
        })

        it('should set page border', () => {
            act(() => useLayoutStore.getState().updateLayout('pageBorder', 'double'))
            expect(useLayoutStore.getState().pageLayout.pageBorder).toBe('double')
        })

        it('should set section gap', () => {
            act(() => useLayoutStore.getState().updateLayout('sectionGap', 24))
            expect(useLayoutStore.getState().pageLayout.sectionGap).toBe(24)
        })
    })

    // ── Section Layout Management ─────────────────────────────
    describe('Section Layouts', () => {
        it('should create a new section layout with defaults', () => {
            act(() => useLayoutStore.getState().setSectionLayout('sec-1', { columnCount: 2 }))
            const layouts = useLayoutStore.getState().pageLayout.sectionLayouts
            expect(layouts).toHaveLength(1)
            expect(layouts[0].sectionId).toBe('sec-1')
            expect(layouts[0].columnCount).toBe(2)
            expect(layouts[0].polygon).toEqual([[0, 0], [100, 0], [100, 100], [0, 100]])
        })

        it('should update an existing section layout', () => {
            act(() => useLayoutStore.getState().setSectionLayout('sec-1', { columnCount: 1 }))
            act(() => useLayoutStore.getState().setSectionLayout('sec-1', { columnCount: 3 }))
            const layouts = useLayoutStore.getState().pageLayout.sectionLayouts
            expect(layouts).toHaveLength(1)
            expect(layouts[0].columnCount).toBe(3)
        })

        it('should remove a section layout', () => {
            act(() => useLayoutStore.getState().setSectionLayout('sec-1', {}))
            act(() => useLayoutStore.getState().removeSectionLayout('sec-1'))
            expect(useLayoutStore.getState().pageLayout.sectionLayouts).toHaveLength(0)
        })

        it('should clear all section layouts', () => {
            act(() => useLayoutStore.getState().setSectionLayout('sec-1', {}))
            act(() => useLayoutStore.getState().setSectionLayout('sec-2', {}))
            act(() => useLayoutStore.getState().clearAllSectionLayouts())
            expect(useLayoutStore.getState().pageLayout.sectionLayouts).toHaveLength(0)
        })

        it('should set section layouts in bulk', () => {
            const layouts = [
                { sectionId: 'a', polygon: [[0, 0], [50, 0], [50, 100], [0, 100]] as [number, number][], columnCount: 1 as const, pageIndex: 0 },
                { sectionId: 'b', polygon: [[50, 0], [100, 0], [100, 100], [50, 100]] as [number, number][], columnCount: 1 as const, pageIndex: 0 },
            ]
            act(() => useLayoutStore.getState().setSectionLayouts(layouts))
            expect(useLayoutStore.getState().pageLayout.sectionLayouts).toHaveLength(2)
        })
    })

    // ── Polygon Vertex Editing ────────────────────────────────
    describe('Polygon Editing', () => {
        beforeEach(() => {
            act(() => {
                useLayoutStore.getState().setSectionLayout('sec-1', {
                    polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
                })
            })
        })

        it('should set a polygon vertex', () => {
            act(() => useLayoutStore.getState().setPolygonVertex('sec-1', 1, [80, 10]))
            const polygon = useLayoutStore.getState().pageLayout.sectionLayouts[0].polygon
            expect(polygon[1]).toEqual([80, 10])
        })

        it('should add a polygon vertex', () => {
            act(() => useLayoutStore.getState().addPolygonVertex('sec-1', 0, [50, 0]))
            const polygon = useLayoutStore.getState().pageLayout.sectionLayouts[0].polygon
            expect(polygon).toHaveLength(5)
            expect(polygon[1]).toEqual([50, 0])
        })

        it('should remove a polygon vertex (min 3)', () => {
            act(() => useLayoutStore.getState().addPolygonVertex('sec-1', 0, [50, 0]))
            act(() => useLayoutStore.getState().removePolygonVertex('sec-1', 1))
            const polygon = useLayoutStore.getState().pageLayout.sectionLayouts[0].polygon
            expect(polygon).toHaveLength(4)
        })

        it('should not remove vertex if polygon has only 3 vertices', () => {
            // Remove one to get to 3
            act(() => useLayoutStore.getState().removePolygonVertex('sec-1', 3))
            // Try removing another — should be no-op
            act(() => useLayoutStore.getState().removePolygonVertex('sec-1', 2))
            const polygon = useLayoutStore.getState().pageLayout.sectionLayouts[0].polygon
            expect(polygon).toHaveLength(3)
        })
    })

    // ── Multi-Page Management ─────────────────────────────────
    describe('Multi-Page', () => {
        it('should disable multi-page (clear pages)', () => {
            act(() => useLayoutStore.getState().enableMultiPageMode())
            act(() => useLayoutStore.getState().disableMultiPageMode())
            expect(useLayoutStore.getState().pageLayout.pages).toBeUndefined()
        })

        it('should remove a page and move sections to first remaining page', () => {
            act(() => {
                useLayoutStore.getState().enableMultiPageMode()
                useLayoutStore.getState().addPage('Page 2')
            })
            const pages = useLayoutStore.getState().pageLayout.pages!
            const page2Id = pages[1].id
            // Assign a section to page 2
            act(() => useLayoutStore.getState().assignSectionToPage('test-sec', page2Id))
            // Remove page 2
            act(() => useLayoutStore.getState().removePage(page2Id))
            const remaining = useLayoutStore.getState().pageLayout.pages!
            expect(remaining).toHaveLength(1)
            // The section should have been moved to page 1
            expect(remaining[0].sectionIds).toContain('test-sec')
        })

        it('should not remove the last page', () => {
            act(() => useLayoutStore.getState().enableMultiPageMode())
            const pageId = useLayoutStore.getState().pageLayout.pages![0].id
            act(() => useLayoutStore.getState().removePage(pageId))
            // Should still have 1 page
            expect(useLayoutStore.getState().pageLayout.pages).toHaveLength(1)
        })

        it('should rename a page', () => {
            act(() => useLayoutStore.getState().enableMultiPageMode())
            const pageId = useLayoutStore.getState().pageLayout.pages![0].id
            act(() => useLayoutStore.getState().renamePage(pageId, 'Front Page'))
            expect(useLayoutStore.getState().pageLayout.pages![0].name).toBe('Front Page')
        })

        it('should set per-page column count', () => {
            act(() => useLayoutStore.getState().enableMultiPageMode())
            const pageId = useLayoutStore.getState().pageLayout.pages![0].id
            act(() => useLayoutStore.getState().setPageColumnCount(pageId, 3))
            expect(useLayoutStore.getState().pageLayout.pages![0].columnCount).toBe(3)
        })

        it('should assign section to a page (removing from others)', () => {
            act(() => {
                useLayoutStore.getState().enableMultiPageMode()
                useLayoutStore.getState().addPage('Page 2')
            })
            const pages = useLayoutStore.getState().pageLayout.pages!
            const page2Id = pages[1].id
            act(() => useLayoutStore.getState().assignSectionToPage('my-sec', page2Id))
            const updated = useLayoutStore.getState().pageLayout.pages!
            expect(updated[1].sectionIds).toContain('my-sec')
            expect(updated[0].sectionIds).not.toContain('my-sec')
        })

        it('should remove section from all pages', () => {
            act(() => {
                useLayoutStore.getState().enableMultiPageMode()
            })
            const pageId = useLayoutStore.getState().pageLayout.pages![0].id
            act(() => useLayoutStore.getState().assignSectionToPage('sec-x', pageId))
            act(() => useLayoutStore.getState().removeSectionFromPages('sec-x'))
            const pages = useLayoutStore.getState().pageLayout.pages!
            for (const page of pages) {
                expect(page.sectionIds).not.toContain('sec-x')
            }
        })
    })

    // ── Fragment-Aware Section Layout ──────────────────────────
    describe('Fragment Layout', () => {
        it('setFragmentLayout should update only the matching fragment', () => {
            // Create two fragments for the same section (split)
            const layouts = [
                { sectionId: 'sec-1', polygon: [[0, 0], [50, 0], [50, 50], [0, 50]] as [number, number][], columnCount: 1 as const, pageIndex: 0, endItemIndex: 5 },
                { sectionId: 'sec-1', polygon: [[0, 50], [50, 50], [50, 100], [0, 100]] as [number, number][], columnCount: 1 as const, pageIndex: 0, startItemIndex: 5 },
                { sectionId: 'sec-2', polygon: [[50, 0], [100, 0], [100, 100], [50, 100]] as [number, number][], columnCount: 1 as const, pageIndex: 0 },
            ]
            act(() => useLayoutStore.getState().setSectionLayouts(layouts))

            // Update only the second fragment (startItemIndex=5)
            const newPolygon: [number, number][] = [[10, 60], [60, 60], [60, 90], [10, 90]]
            act(() => useLayoutStore.getState().setFragmentLayout('sec-1:5', { polygon: newPolygon }))

            const updated = useLayoutStore.getState().pageLayout.sectionLayouts
            expect(updated).toHaveLength(3)

            // First fragment should be unchanged
            expect(updated[0].polygon).toEqual([[0, 0], [50, 0], [50, 50], [0, 50]])
            expect(updated[0].endItemIndex).toBe(5)

            // Second fragment (the target) should have the new polygon
            expect(updated[1].polygon).toEqual(newPolygon)
            expect(updated[1].startItemIndex).toBe(5)

            // sec-2 should be unchanged
            expect(updated[2].sectionId).toBe('sec-2')
        })

        it('setFragmentLayout should create a new layout when not found', () => {
            act(() => useLayoutStore.getState().setFragmentLayout('new-sec:0', { columnCount: 2 }))
            const layouts = useLayoutStore.getState().pageLayout.sectionLayouts
            expect(layouts).toHaveLength(1)
            expect(layouts[0].sectionId).toBe('new-sec')
            expect(layouts[0].columnCount).toBe(2)
        })

        it('removeFragmentLayout should remove only the matching fragment', () => {
            const layouts = [
                { sectionId: 'sec-1', polygon: [[0, 0], [50, 0], [50, 50], [0, 50]] as [number, number][], columnCount: 1 as const, pageIndex: 0, endItemIndex: 5 },
                { sectionId: 'sec-1', polygon: [[0, 50], [50, 50], [50, 100], [0, 100]] as [number, number][], columnCount: 1 as const, pageIndex: 0, startItemIndex: 5 },
            ]
            act(() => useLayoutStore.getState().setSectionLayouts(layouts))

            act(() => useLayoutStore.getState().removeFragmentLayout('sec-1:5'))

            const remaining = useLayoutStore.getState().pageLayout.sectionLayouts
            expect(remaining).toHaveLength(1)
            expect(remaining[0].sectionId).toBe('sec-1')
            expect(remaining[0].startItemIndex).toBeUndefined()
        })
    })

    // ── Load & Reset ──────────────────────────────────────────
    describe('Bulk operations', () => {
        it('should load a complete page layout', () => {
            const custom = {
                ...useLayoutStore.getState().pageLayout,
                pageSize: 'a4' as const,
                orientation: 'landscape' as const,
                columnCount: 3 as const,
            }
            act(() => useLayoutStore.getState().loadPageLayout(custom))
            const layout = useLayoutStore.getState().pageLayout
            expect(layout.pageSize).toBe('a4')
            expect(layout.orientation).toBe('landscape')
            expect(layout.columnCount).toBe(3)
        })
    })
})
