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
            expect(scheme.background).toBe('#FFFDF5')
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
            act(() => useLayoutStore.getState().setLayoutDirection('horizontal'))
            expect(useLayoutStore.getState().pageLayout.layoutDirection).toBe('horizontal')
        })

        it('should set item separator', () => {
            act(() => useLayoutStore.getState().setItemSeparator('dots'))
            expect(useLayoutStore.getState().pageLayout.itemSeparator).toBe('dots')
        })

        it('should set price format', () => {
            act(() => useLayoutStore.getState().setPriceFormat('dot-leaders'))
            expect(useLayoutStore.getState().pageLayout.priceFormat).toBe('dot-leaders')
        })

        it('should set section decoration', () => {
            act(() => useLayoutStore.getState().setSectionDecoration('border'))
            expect(useLayoutStore.getState().pageLayout.sectionDecoration).toBe('border')
        })

        it('should set currency', () => {
            act(() => useLayoutStore.getState().setCurrency('€'))
            expect(useLayoutStore.getState().pageLayout.currency).toBe('€')
        })

        it('should set background texture', () => {
            act(() => useLayoutStore.getState().setBackgroundTexture('parchment'))
            expect(useLayoutStore.getState().pageLayout.backgroundTexture).toBe('parchment')
        })

        it('should set section divider', () => {
            act(() => useLayoutStore.getState().setSectionDivider('flourish'))
            expect(useLayoutStore.getState().pageLayout.sectionDivider).toBe('flourish')
        })

        it('should set page border', () => {
            act(() => useLayoutStore.getState().setPageBorder('double'))
            expect(useLayoutStore.getState().pageLayout.pageBorder).toBe('double')
        })

        it('should set section gap', () => {
            act(() => useLayoutStore.getState().setSectionGap(24))
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
