import { describe, it, expect, beforeEach } from 'vitest'
import { useMenuStore } from '../menu-store'
import { act } from '@testing-library/react'
import { MenuData } from '../../models/menu'

const simpleMenuData: MenuData = {
    title: 'Test Menu',
    subtitle: 'Test Subtitle',
    footer: 'Test Footer',
    sections: [
        {
            id: 'section-1',
            title: 'Section 1',
            subtitle: 'Subtitle 1',
            footnote: 'Footnote 1',
            items: []
        }
    ]
}

describe('Menu Store', () => {
    beforeEach(() => {
        act(() => {
            useMenuStore.getState().loadMenuData(simpleMenuData)
        })
    })

    it('should initialize with provided data', () => {
        const { menuData } = useMenuStore.getState()
        expect(menuData.title).toBe('Test Menu')
        expect(menuData.sections).toHaveLength(1)
    })

    it('should update title', () => {
        act(() => {
            useMenuStore.getState().setTitle('Updated Title')
        })
        expect(useMenuStore.getState().menuData.title).toBe('Updated Title')
    })

    it('should add a section', () => {
        const initialCount = useMenuStore.getState().menuData.sections.length
        act(() => {
            useMenuStore.getState().addSection()
        })
        expect(useMenuStore.getState().menuData.sections).toHaveLength(initialCount + 1)
    })

    it('should remove a section', () => {
        // Add a section first so we have 2
        act(() => {
            useMenuStore.getState().addSection()
        })
        const sections = useMenuStore.getState().menuData.sections
        const sectionId = sections[1].id // The new section

        act(() => {
            useMenuStore.getState().removeSection(sectionId)
        })
        expect(useMenuStore.getState().menuData.sections).toHaveLength(1)
        expect(useMenuStore.getState().menuData.sections[0].id).toBe('section-1')
    })

    it('should add an item to a section', () => {
        act(() => {
            useMenuStore.getState().addItem('section-1')
        })
        const section = useMenuStore.getState().menuData.sections.find(s => s.id === 'section-1')
        expect(section?.items).toHaveLength(1)
    })

    it('should update an item', () => {
        act(() => {
            useMenuStore.getState().addItem('section-1')
        })
        const items = useMenuStore.getState().menuData.sections[0].items
        const itemId = items[0].id

        act(() => {
            useMenuStore.getState().updateItem('section-1', itemId, { name: 'Burger', price: '10' })
        })

        const updatedItem = useMenuStore.getState().menuData.sections[0].items[0]
        expect(updatedItem.name).toBe('Burger')
        expect(updatedItem.price).toBe('10')
    })

    it('should remove an item', () => {
        act(() => {
            useMenuStore.getState().addItem('section-1')
        })
        const items = useMenuStore.getState().menuData.sections[0].items
        const itemId = items[0].id

        act(() => {
            useMenuStore.getState().removeItem('section-1', itemId)
        })

        const section = useMenuStore.getState().menuData.sections[0]
        expect(section.items).toHaveLength(0)
    })

    it('should reset to default data', () => {
        act(() => {
            useMenuStore.getState().reset()
        })
        // Default data has 4 sections as per models/menu.ts
        expect(useMenuStore.getState().menuData.sections).toHaveLength(4)
    })
})
