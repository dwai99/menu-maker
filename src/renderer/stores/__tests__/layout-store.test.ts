import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '../layout-store'
import { act } from '@testing-library/react'

describe('Layout Store', () => {
    beforeEach(() => {
        act(() => {
            useLayoutStore.getState().reset()
        })
    })

    it('should initialize with default layout', () => {
        const { pageLayout } = useLayoutStore.getState()
        expect(pageLayout.pageSize).toBe('letter')
        expect(pageLayout.orientation).toBe('portrait')
        expect(pageLayout.margins.top).toBe(0.75)
    })

    it('should set page size', () => {
        act(() => {
            useLayoutStore.getState().setPageSize('a4')
        })
        expect(useLayoutStore.getState().pageLayout.pageSize).toBe('a4')
    })

    it('should set orientation', () => {
        act(() => {
            useLayoutStore.getState().setOrientation('landscape')
        })
        expect(useLayoutStore.getState().pageLayout.orientation).toBe('landscape')
    })

    it('should set margins', () => {
        const newMargins = { top: 1, right: 1, bottom: 1, left: 1 }
        act(() => {
            useLayoutStore.getState().setMargins(newMargins)
        })
        expect(useLayoutStore.getState().pageLayout.margins).toEqual(newMargins)
    })

    it('should set column count', () => {
        act(() => {
            useLayoutStore.getState().setColumnCount(2)
        })
        expect(useLayoutStore.getState().pageLayout.columnCount).toBe(2)
    })

    it('should set section layout', () => {
        const sectionId = 'test-section'
        act(() => {
            useLayoutStore.getState().setSectionLayout(sectionId, { columnCount: 2 })
        })

        const layout = useLayoutStore.getState().pageLayout.sectionLayouts.find(sl => sl.sectionId === sectionId)
        expect(layout).toBeDefined()
        expect(layout?.columnCount).toBe(2)
        expect(layout?.polygon).toBeDefined() // Should be created with defaults
    })

    it('should enable multi-page mode', () => {
        act(() => {
            useLayoutStore.getState().enableMultiPageMode()
        })

        expect(useLayoutStore.getState().pageLayout.pages).toBeDefined()
        expect(useLayoutStore.getState().pageLayout.pages).toHaveLength(1)
    })

    it('should add a page in multi-page mode', () => {
        act(() => {
            useLayoutStore.getState().enableMultiPageMode()
            useLayoutStore.getState().addPage('Page 2')
        })
        expect(useLayoutStore.getState().pageLayout.pages).toHaveLength(2)
        expect(useLayoutStore.getState().pageLayout.pages?.[1].name).toBe('Page 2')
    })
})
