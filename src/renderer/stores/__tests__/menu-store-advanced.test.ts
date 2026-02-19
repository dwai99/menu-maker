import { describe, it, expect, beforeEach } from 'vitest'
import { useMenuStore } from '../menu-store'
import { act } from '@testing-library/react'
import { MenuData } from '../../models/menu'

/**
 * Comprehensive edge-case tests for menu-store operations.
 * These tests focus on reorder, duplicate, move, and dietary icon toggling.
 */

const fixtureData: MenuData = {
    title: 'Test Menu',
    subtitle: 'Test Subtitle',
    footer: 'Test Footer',
    sections: [
        {
            id: 'sec-A',
            title: 'Appetizers',
            subtitle: '',
            footnote: '',
            items: [
                { id: 'item-1', name: 'Wings', description: '', price: '10', priceLabel: '', tags: [], isAvailable: true },
                { id: 'item-2', name: 'Fries', description: '', price: '8', priceLabel: '', tags: [], isAvailable: true },
                { id: 'item-3', name: 'Nachos', description: '', price: '12', priceLabel: '', tags: [], isAvailable: true },
            ],
        },
        {
            id: 'sec-B',
            title: 'Mains',
            subtitle: '',
            footnote: '',
            items: [
                { id: 'item-4', name: 'Burger', description: '', price: '15', priceLabel: '', tags: [], isAvailable: true },
            ],
        },
        {
            id: 'sec-C',
            title: 'Desserts',
            subtitle: '',
            footnote: '',
            items: [],
        },
    ],
}

describe('Menu Store - Advanced Operations', () => {
    beforeEach(() => {
        act(() => {
            // Deep clone fixture to prevent test contamination
            useMenuStore.getState().loadMenuData(JSON.parse(JSON.stringify(fixtureData)))
        })
    })

    // ── Subtitle & Footer ────────────────────────────────────
    describe('Menu-level fields', () => {
        it('should update subtitle', () => {
            act(() => useMenuStore.getState().setSubtitle('New Subtitle'))
            expect(useMenuStore.getState().menuData.subtitle).toBe('New Subtitle')
        })

        it('should update footer', () => {
            act(() => useMenuStore.getState().setFooter('New Footer'))
            expect(useMenuStore.getState().menuData.footer).toBe('New Footer')
        })

        it('should set and clear logo', () => {
            const logo = { dataUrl: 'data:image/png;base64,abc', width: 100, height: 50, x: 50, y: 0 }
            act(() => useMenuStore.getState().setLogo(logo))
            expect(useMenuStore.getState().menuData.logo).toEqual(logo)

            act(() => useMenuStore.getState().setLogo(undefined))
            expect(useMenuStore.getState().menuData.logo).toBeUndefined()
        })
    })

    // ── Section Reordering ────────────────────────────────────
    describe('reorderSections', () => {
        it('should move section from first to last', () => {
            act(() => useMenuStore.getState().reorderSections(0, 2))
            const titles = useMenuStore.getState().menuData.sections.map(s => s.title)
            expect(titles).toEqual(['Mains', 'Desserts', 'Appetizers'])
        })

        it('should move section from last to first', () => {
            act(() => useMenuStore.getState().reorderSections(2, 0))
            const titles = useMenuStore.getState().menuData.sections.map(s => s.title)
            expect(titles).toEqual(['Desserts', 'Appetizers', 'Mains'])
        })

        it('should be no-op when from === to', () => {
            act(() => useMenuStore.getState().reorderSections(1, 1))
            const titles = useMenuStore.getState().menuData.sections.map(s => s.title)
            expect(titles).toEqual(['Appetizers', 'Mains', 'Desserts'])
        })
    })

    // ── Section Duplication ───────────────────────────────────
    describe('duplicateSection', () => {
        it('should create a copy after the original', () => {
            act(() => useMenuStore.getState().duplicateSection('sec-A'))
            const sections = useMenuStore.getState().menuData.sections
            expect(sections).toHaveLength(4)
            expect(sections[1].title).toBe('Appetizers (copy)')
        })

        it('should give the copy new unique IDs', () => {
            act(() => useMenuStore.getState().duplicateSection('sec-A'))
            const sections = useMenuStore.getState().menuData.sections
            const original = sections[0]
            const copy = sections[1]
            expect(copy.id).not.toBe(original.id)
            // Item IDs should also be different
            for (let i = 0; i < original.items.length; i++) {
                expect(copy.items[i].id).not.toBe(original.items[i].id)
            }
        })

        it('should preserve item data in the copy', () => {
            act(() => useMenuStore.getState().duplicateSection('sec-A'))
            const copy = useMenuStore.getState().menuData.sections[1]
            expect(copy.items).toHaveLength(3)
            expect(copy.items[0].name).toBe('Wings')
            expect(copy.items[0].price).toBe('10')
        })

        it('should be no-op for non-existent section', () => {
            act(() => useMenuStore.getState().duplicateSection('non-existent'))
            expect(useMenuStore.getState().menuData.sections).toHaveLength(3)
        })
    })

    // ── Section Color Override ────────────────────────────────
    describe('updateSectionColor', () => {
        it('should set color override', () => {
            act(() => useMenuStore.getState().updateSectionColor('sec-A', { accent: '#ff0000' }))
            const section = useMenuStore.getState().menuData.sections[0]
            expect(section.colorOverride).toEqual({ accent: '#ff0000' })
        })

        it('should clear color override', () => {
            act(() => useMenuStore.getState().updateSectionColor('sec-A', { accent: '#ff0000' }))
            act(() => useMenuStore.getState().updateSectionColor('sec-A', undefined))
            const section = useMenuStore.getState().menuData.sections[0]
            expect(section.colorOverride).toBeUndefined()
        })
    })

    // ── Item Reordering ───────────────────────────────────────
    describe('reorderItems', () => {
        it('should move first item to last', () => {
            act(() => useMenuStore.getState().reorderItems('sec-A', 0, 2))
            const names = useMenuStore.getState().menuData.sections[0].items.map(i => i.name)
            expect(names).toEqual(['Fries', 'Nachos', 'Wings'])
        })

        it('should move last item to first', () => {
            act(() => useMenuStore.getState().reorderItems('sec-A', 2, 0))
            const names = useMenuStore.getState().menuData.sections[0].items.map(i => i.name)
            expect(names).toEqual(['Nachos', 'Wings', 'Fries'])
        })
    })

    // ── Move Item Between Sections ────────────────────────────
    describe('moveItem', () => {
        it('should move item from sec-A to sec-B', () => {
            act(() => useMenuStore.getState().moveItem('sec-A', 'sec-B', 'item-1', 0))
            const secA = useMenuStore.getState().menuData.sections.find(s => s.id === 'sec-A')!
            const secB = useMenuStore.getState().menuData.sections.find(s => s.id === 'sec-B')!
            expect(secA.items).toHaveLength(2)
            expect(secB.items).toHaveLength(2)
            expect(secB.items[0].id).toBe('item-1')
        })

        it('should move item to a specific index', () => {
            act(() => useMenuStore.getState().moveItem('sec-A', 'sec-B', 'item-2', 1))
            const secB = useMenuStore.getState().menuData.sections.find(s => s.id === 'sec-B')!
            expect(secB.items[1].id).toBe('item-2')
        })

        it('should be no-op for non-existent item', () => {
            act(() => useMenuStore.getState().moveItem('sec-A', 'sec-B', 'non-existent', 0))
            const secA = useMenuStore.getState().menuData.sections.find(s => s.id === 'sec-A')!
            expect(secA.items).toHaveLength(3)
        })

        it('should move item to an empty section', () => {
            act(() => useMenuStore.getState().moveItem('sec-A', 'sec-C', 'item-1', 0))
            const secC = useMenuStore.getState().menuData.sections.find(s => s.id === 'sec-C')!
            expect(secC.items).toHaveLength(1)
            expect(secC.items[0].name).toBe('Wings')
        })
    })

    // ── Duplicate Item ────────────────────────────────────────
    describe('duplicateItem', () => {
        it('should create a copy after the original', () => {
            act(() => useMenuStore.getState().duplicateItem('sec-A', 'item-1'))
            const items = useMenuStore.getState().menuData.sections[0].items
            expect(items).toHaveLength(4)
            expect(items[1].name).toBe('Wings') // same data
            expect(items[1].id).not.toBe('item-1') // new ID
        })

        it('should be no-op for non-existent item', () => {
            act(() => useMenuStore.getState().duplicateItem('sec-A', 'non-existent'))
            expect(useMenuStore.getState().menuData.sections[0].items).toHaveLength(3)
        })
    })

    // ── Toggle Dietary Icons ──────────────────────────────────
    describe('toggleDietaryIcon', () => {
        it('should add a dietary icon', () => {
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'v'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.dietaryIcons).toEqual(['v'])
        })

        it('should remove a dietary icon on second toggle', () => {
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'v'))
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'v'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.dietaryIcons).toEqual([])
        })

        it('should support multiple dietary icons', () => {
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'v'))
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'gf'))
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'spicy'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.dietaryIcons).toEqual(['v', 'gf', 'spicy'])
        })

        it('should only remove the toggled icon', () => {
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'v'))
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'gf'))
            act(() => useMenuStore.getState().toggleDietaryIcon('sec-A', 'item-1', 'v'))
            const item = useMenuStore.getState().menuData.sections[0].items[0]
            expect(item.dietaryIcons).toEqual(['gf'])
        })
    })

    // ── Update Section ────────────────────────────────────────
    describe('updateSection', () => {
        it('should update section title', () => {
            act(() => useMenuStore.getState().updateSection('sec-A', { title: 'Starters' }))
            expect(useMenuStore.getState().menuData.sections[0].title).toBe('Starters')
        })

        it('should update multiple fields at once', () => {
            act(() => useMenuStore.getState().updateSection('sec-A', { title: 'X', subtitle: 'Y', footnote: 'Z' }))
            const section = useMenuStore.getState().menuData.sections[0]
            expect(section.title).toBe('X')
            expect(section.subtitle).toBe('Y')
            expect(section.footnote).toBe('Z')
        })

        it('should not affect other sections', () => {
            act(() => useMenuStore.getState().updateSection('sec-A', { title: 'Changed' }))
            expect(useMenuStore.getState().menuData.sections[1].title).toBe('Mains')
        })
    })

    // ── Remove last section ───────────────────────────────────
    describe('Edge cases', () => {
        it('should allow removing all sections', () => {
            act(() => useMenuStore.getState().removeSection('sec-A'))
            act(() => useMenuStore.getState().removeSection('sec-B'))
            act(() => useMenuStore.getState().removeSection('sec-C'))
            expect(useMenuStore.getState().menuData.sections).toHaveLength(0)
        })

        it('should not crash when removing from non-existent section', () => {
            act(() => useMenuStore.getState().removeItem('non-existent', 'item-1'))
            // No crash, items unchanged
            expect(useMenuStore.getState().menuData.sections[0].items).toHaveLength(3)
        })

        it('should handle loadMenuData with empty sections', () => {
            act(() => useMenuStore.getState().loadMenuData({
                title: 'Empty',
                subtitle: '',
                footer: '',
                sections: [],
            }))
            expect(useMenuStore.getState().menuData.sections).toHaveLength(0)
            expect(useMenuStore.getState().menuData.title).toBe('Empty')
        })
    })
})
