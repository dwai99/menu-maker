import { describe, it, expect, beforeEach } from 'vitest'
import { useMenuStore } from '../menu-store'
import { act } from '@testing-library/react'
import type { MenuData } from '../../models/menu'

/**
 * Tests for menu-store actions not covered elsewhere:
 * - toggleItemBadge
 * - toggleItemHighlight
 * - updateSectionIcon
 * - appendSections
 * - undo/redo via temporal middleware
 * - setLogo / setTitlePosition / setSubtitlePosition
 */

const fixtureData: MenuData = {
    title: 'Badge Menu',
    subtitle: 'Subtitle',
    footer: 'Footer',
    sections: [
        {
            id: 'sec-A',
            title: 'Food',
            subtitle: '',
            footnote: '',
            items: [
                { id: 'item-1', name: 'Wings', description: '', price: '10', priceLabel: '', tags: [], isAvailable: true },
                { id: 'item-2', name: 'Burger', description: '', price: '15', priceLabel: '', tags: [], isAvailable: true },
            ],
        },
        {
            id: 'sec-B',
            title: 'Drinks',
            subtitle: '',
            footnote: '',
            items: [],
        },
    ],
}

describe('Menu Store - Badges, Icons, Undo/Redo', () => {
    beforeEach(() => {
        act(() => {
            useMenuStore.getState().loadMenuData(JSON.parse(JSON.stringify(fixtureData)))
            // Clear temporal history so undo/redo tests start clean
            useMenuStore.temporal.getState().clear()
        })
    })

    // ── toggleItemBadge ───────────────────────────────────────
    describe('toggleItemBadge', () => {
        it('should add a badge to an item', () => {
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.badges).toContain('new')
        })

        it('should remove a badge on second toggle', () => {
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.badges).not.toContain('new')
        })

        it('should allow multiple badges simultaneously', () => {
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'popular'))
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'seasonal'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.badges).toContain('new')
            expect(item.badges).toContain('popular')
            expect(item.badges).toContain('seasonal')
        })

        it('should only remove the toggled badge, leaving others intact', () => {
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'popular'))
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.badges).not.toContain('new')
            expect(item.badges).toContain('popular')
        })

        it('should support all badge types', () => {
            const badges = ['new', 'popular', 'chefs-pick', 'seasonal'] as const
            for (const badge of badges) {
                act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', badge))
            }
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.badges).toHaveLength(4)
            for (const badge of badges) {
                expect(item.badges).toContain(badge)
            }
        })

        it('should not affect other items in the same section', () => {
            act(() => useMenuStore.getState().toggleItemBadge('sec-A', 'item-1', 'new'))
            const item2 = useMenuStore.getState().menuData.sections[0].items[1]
            // item-2 should have no badges
            expect(item2.badges ?? []).toHaveLength(0)
        })
    })

    // ── toggleItemHighlight ───────────────────────────────────
    describe('toggleItemHighlight', () => {
        it('should highlight an item', () => {
            act(() => useMenuStore.getState().toggleItemHighlight('sec-A', 'item-1'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.isHighlighted).toBe(true)
        })

        it('should unhighlight on second toggle', () => {
            act(() => useMenuStore.getState().toggleItemHighlight('sec-A', 'item-1'))
            act(() => useMenuStore.getState().toggleItemHighlight('sec-A', 'item-1'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.isHighlighted).toBe(false)
        })

        it('should toggle independently per item', () => {
            act(() => useMenuStore.getState().toggleItemHighlight('sec-A', 'item-1'))
            const item1 = useMenuStore.getState().menuData.sections[0].items[0]
            const item2 = useMenuStore.getState().menuData.sections[0].items[1]
            expect(item1.isHighlighted).toBe(true)
            expect(item2.isHighlighted).toBeFalsy()
        })

        it('should not affect other sections', () => {
            act(() => useMenuStore.getState().toggleItemHighlight('sec-A', 'item-1'))
            const secB = useMenuStore.getState().menuData.sections[1]
            // sec-B has no items so nothing changed there; the section itself should remain
            expect(secB.id).toBe('sec-B')
        })
    })

    // ── updateSectionIcon ─────────────────────────────────────
    describe('updateSectionIcon', () => {
        it('should set an emoji icon on a section', () => {
            act(() => useMenuStore.getState().updateSectionIcon('sec-A', '🍔'))
            const section = useMenuStore.getState().menuData.sections[0]
            expect(section.icon).toBe('🍔')
        })

        it('should update the icon when called again', () => {
            act(() => useMenuStore.getState().updateSectionIcon('sec-A', '🍔'))
            act(() => useMenuStore.getState().updateSectionIcon('sec-A', '🍻'))
            const section = useMenuStore.getState().menuData.sections[0]
            expect(section.icon).toBe('🍻')
        })

        it('should set icon to empty string to clear it', () => {
            act(() => useMenuStore.getState().updateSectionIcon('sec-A', '🍔'))
            act(() => useMenuStore.getState().updateSectionIcon('sec-A', ''))
            const section = useMenuStore.getState().menuData.sections[0]
            expect(section.icon).toBe('')
        })

        it('should not affect other sections', () => {
            act(() => useMenuStore.getState().updateSectionIcon('sec-A', '🍔'))
            const secB = useMenuStore.getState().menuData.sections[1]
            expect(secB.icon).toBeUndefined()
        })
    })

    // ── appendSections ────────────────────────────────────────
    describe('appendSections', () => {
        it('should append new sections to the end', () => {
            const newSections = [
                { id: 'new-1', title: 'Specials', subtitle: '', footnote: '', items: [] },
            ]
            act(() => useMenuStore.getState().appendSections(newSections))
            const sections = useMenuStore.getState().menuData.sections
            expect(sections).toHaveLength(3)
            expect(sections[2].title).toBe('Specials')
        })

        it('should give appended sections new IDs (no conflicts)', () => {
            const newSections = [
                { id: 'original-id', title: 'Specials', subtitle: '', footnote: '', items: [] },
            ]
            act(() => useMenuStore.getState().appendSections(newSections))
            const added = useMenuStore.getState().menuData.sections[2]
            expect(added.id).not.toBe('original-id')
        })

        it('should give appended section items new IDs', () => {
            const originalItemId = 'original-item-id'
            const newSections = [
                {
                    id: 'sec-x',
                    title: 'New Section',
                    subtitle: '',
                    footnote: '',
                    items: [
                        { id: originalItemId, name: 'Pizza', description: '', price: '12', priceLabel: '', tags: [], isAvailable: true },
                    ],
                },
            ]
            act(() => useMenuStore.getState().appendSections(newSections))
            const addedSection = useMenuStore.getState().menuData.sections[2]
            expect(addedSection.items[0].id).not.toBe(originalItemId)
        })

        it('should append multiple sections at once', () => {
            const newSections = [
                { id: 's1', title: 'Appetizers 2', subtitle: '', footnote: '', items: [] },
                { id: 's2', title: 'Desserts 2', subtitle: '', footnote: '', items: [] },
            ]
            act(() => useMenuStore.getState().appendSections(newSections))
            expect(useMenuStore.getState().menuData.sections).toHaveLength(4)
        })

        it('should handle appending empty sections array (no-op)', () => {
            act(() => useMenuStore.getState().appendSections([]))
            expect(useMenuStore.getState().menuData.sections).toHaveLength(2)
        })
    })

    // ── setLogo ───────────────────────────────────────────────
    describe('setLogo', () => {
        it('should set logo data', () => {
            const logo = { dataUrl: 'data:image/png;base64,abc', width: 100, height: 50, x: 50, y: 0 }
            act(() => useMenuStore.getState().setLogo(logo))
            expect(useMenuStore.getState().menuData.logo).toEqual(logo)
        })

        it('should clear logo when set to undefined', () => {
            const logo = { dataUrl: 'data:image/png;base64,abc', width: 100, height: 50, x: 50, y: 0 }
            act(() => useMenuStore.getState().setLogo(logo))
            act(() => useMenuStore.getState().setLogo(undefined))
            expect(useMenuStore.getState().menuData.logo).toBeUndefined()
        })
    })

    // ── setTitlePosition and setSubtitlePosition ──────────────
    describe('element positions', () => {
        it('should set title position', () => {
            const pos = { x: 10, y: 5, width: 80 }
            act(() => useMenuStore.getState().setTitlePosition(pos))
            expect(useMenuStore.getState().menuData.titlePosition).toEqual(pos)
        })

        it('should clear title position when set to undefined', () => {
            act(() => useMenuStore.getState().setTitlePosition({ x: 10, y: 5, width: 80 }))
            act(() => useMenuStore.getState().setTitlePosition(undefined))
            expect(useMenuStore.getState().menuData.titlePosition).toBeUndefined()
        })

        it('should set subtitle position', () => {
            const pos = { x: 15, y: 20, width: 70 }
            act(() => useMenuStore.getState().setSubtitlePosition(pos))
            expect(useMenuStore.getState().menuData.subtitlePosition).toEqual(pos)
        })

        it('should clear subtitle position when set to undefined', () => {
            act(() => useMenuStore.getState().setSubtitlePosition({ x: 15, y: 20, width: 70 }))
            act(() => useMenuStore.getState().setSubtitlePosition(undefined))
            expect(useMenuStore.getState().menuData.subtitlePosition).toBeUndefined()
        })
    })

    // ── Undo/Redo via temporal middleware ─────────────────────
    describe('undo/redo', () => {
        it('should undo a title change', () => {
            const originalTitle = useMenuStore.getState().menuData.title

            act(() => useMenuStore.getState().setTitle('Changed Title'))
            expect(useMenuStore.getState().menuData.title).toBe('Changed Title')

            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.title).toBe(originalTitle)
        })

        it('should redo a title change after undo', () => {
            act(() => useMenuStore.getState().setTitle('Changed Title'))
            act(() => useMenuStore.temporal.getState().undo())
            act(() => useMenuStore.temporal.getState().redo())
            expect(useMenuStore.getState().menuData.title).toBe('Changed Title')
        })

        it('should undo addSection', () => {
            const initialCount = useMenuStore.getState().menuData.sections.length
            act(() => useMenuStore.getState().addSection())
            expect(useMenuStore.getState().menuData.sections).toHaveLength(initialCount + 1)

            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.sections).toHaveLength(initialCount)
        })

        it('should undo removeSection', () => {
            const initialCount = useMenuStore.getState().menuData.sections.length
            act(() => useMenuStore.getState().removeSection('sec-A'))
            expect(useMenuStore.getState().menuData.sections).toHaveLength(initialCount - 1)

            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.sections).toHaveLength(initialCount)
        })

        it('should undo addItem', () => {
            const initialItemCount = useMenuStore.getState().menuData.sections[0].items.length
            act(() => useMenuStore.getState().addItem('sec-A'))
            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.sections[0].items).toHaveLength(initialItemCount)
        })

        it('should support multiple undo steps', () => {
            const initialTitle = useMenuStore.getState().menuData.title
            act(() => useMenuStore.getState().setTitle('Step 1'))
            act(() => useMenuStore.getState().setTitle('Step 2'))
            act(() => useMenuStore.getState().setTitle('Step 3'))

            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.title).toBe('Step 2')

            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.title).toBe('Step 1')

            act(() => useMenuStore.temporal.getState().undo())
            expect(useMenuStore.getState().menuData.title).toBe(initialTitle)
        })

        it('should not crash when there is nothing to undo', () => {
            // Clear history first
            act(() => useMenuStore.temporal.getState().clear())
            expect(() => {
                act(() => useMenuStore.temporal.getState().undo())
            }).not.toThrow()
        })

        it('should not crash when there is nothing to redo', () => {
            expect(() => {
                act(() => useMenuStore.temporal.getState().redo())
            }).not.toThrow()
        })
    })
})
