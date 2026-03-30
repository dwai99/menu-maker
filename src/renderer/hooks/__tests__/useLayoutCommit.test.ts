import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useLayoutCommit } from '../useLayoutCommit'
import { useUIStore } from '@/stores/ui-store'
import { useLayoutStore } from '@/stores/layout-store'
import type { SectionLayout } from '@/models/layout'

// Mock scrollHeight on divs
function createMockDiv(scrollHeight: number): HTMLDivElement {
  const div = document.createElement('div')
  Object.defineProperty(div, 'scrollHeight', { value: scrollHeight, writable: true })
  return div
}

describe('useLayoutCommit', () => {
  beforeEach(() => {
    act(() => {
      useUIStore.setState({ pendingLayoutCommit: false })
      useLayoutStore.getState().setSectionLayouts([])
    })
  })

  it('should not run when pendingLayoutCommit is false', () => {
    const layouts: SectionLayout[] = [
      {
        sectionId: 'sec-1',
        polygon: [[0, 0], [100, 0], [100, 50], [0, 50]],
        columnCount: 1,
        pageIndex: 0,
      },
    ]

    const refs = new Map<string, HTMLDivElement | null>()
    refs.set('sec-1:0', createMockDiv(100))

    renderHook(() =>
      useLayoutCommit({
        sectionRefs: refs,
        sectionLayouts: layouts,
        contentHeightPx: 800,
        zoom: 1,
      })
    )

    // pendingLayoutCommit is false, so no commit should happen
    expect(useUIStore.getState().pendingLayoutCommit).toBe(false)
  })

  it('should clear pendingLayoutCommit after commit', () => {
    const layouts: SectionLayout[] = [
      {
        sectionId: 'sec-1',
        polygon: [[0, 0], [100, 0], [100, 50], [0, 50]],
        columnCount: 1,
        pageIndex: 0,
      },
    ]

    // Set up store with layouts
    act(() => {
      useLayoutStore.getState().setSectionLayouts(layouts)
    })

    const refs = new Map<string, HTMLDivElement | null>()
    refs.set('sec-1:0', createMockDiv(100))

    // Set pending flag BEFORE rendering the hook
    act(() => {
      useUIStore.getState().setPendingLayoutCommit(true)
    })

    renderHook(() =>
      useLayoutCommit({
        sectionRefs: refs,
        sectionLayouts: layouts,
        contentHeightPx: 800,
        zoom: 1,
      })
    )

    expect(useUIStore.getState().pendingLayoutCommit).toBe(false)
  })

  it('should shrink polygon when content is shorter than allocated', () => {
    // Section allocated 50% of 800px = 400px, but content is only 100px
    const layouts: SectionLayout[] = [
      {
        sectionId: 'sec-1',
        polygon: [[0, 0], [100, 0], [100, 50], [0, 50]],
        columnCount: 1,
        pageIndex: 0,
      },
    ]

    act(() => {
      useLayoutStore.getState().setSectionLayouts(layouts)
    })

    const refs = new Map<string, HTMLDivElement | null>()
    // scrollHeight = 100px at zoom=1, allocated = 50% of 800 = 400px
    refs.set('sec-1:0', createMockDiv(100))

    act(() => {
      useUIStore.getState().setPendingLayoutCommit(true)
    })

    renderHook(() =>
      useLayoutCommit({
        sectionRefs: refs,
        sectionLayouts: layouts,
        contentHeightPx: 800,
        zoom: 1,
      })
    )

    // Check that the store was updated with a smaller polygon height
    const updated = useLayoutStore.getState().pageLayout.sectionLayouts
    expect(updated.length).toBe(1)
    const bbox = {
      height: updated[0].polygon[2][1] - updated[0].polygon[0][1],
    }
    // (100 + 4 padding) / 800 * 100 = 13%
    expect(bbox.height).toBeCloseTo(13, 0)
  })

  it('should not grow polygon when content overflows', () => {
    // Section allocated 10% of 800px = 80px, content is 200px (overflows)
    const layouts: SectionLayout[] = [
      {
        sectionId: 'sec-1',
        polygon: [[0, 0], [100, 0], [100, 10], [0, 10]],
        columnCount: 1,
        pageIndex: 0,
      },
    ]

    act(() => {
      useLayoutStore.getState().setSectionLayouts(layouts)
    })

    const refs = new Map<string, HTMLDivElement | null>()
    refs.set('sec-1:0', createMockDiv(200))

    act(() => {
      useUIStore.getState().setPendingLayoutCommit(true)
    })

    renderHook(() =>
      useLayoutCommit({
        sectionRefs: refs,
        sectionLayouts: layouts,
        contentHeightPx: 800,
        zoom: 1,
      })
    )

    // Height should remain at 10% (not grow to accommodate overflow)
    const updated = useLayoutStore.getState().pageLayout.sectionLayouts
    const height = updated[0].polygon[2][1] - updated[0].polygon[0][1]
    expect(height).toBeCloseTo(10, 0)
  })

  it('should restack sections within the same column', () => {
    // Two sections in same column, first one shrinks, second should move up
    const layouts: SectionLayout[] = [
      {
        sectionId: 'sec-1',
        polygon: [[0, 0], [100, 0], [100, 50], [0, 50]],
        columnCount: 1,
        pageIndex: 0,
      },
      {
        sectionId: 'sec-2',
        polygon: [[0, 55], [100, 55], [100, 80], [0, 80]],
        columnCount: 1,
        pageIndex: 0,
      },
    ]

    act(() => {
      useLayoutStore.getState().setSectionLayouts(layouts)
    })

    const refs = new Map<string, HTMLDivElement | null>()
    // sec-1: allocated 50% of 800 = 400px, content = 100px → shrinks
    refs.set('sec-1:0', createMockDiv(100))
    // sec-2: allocated 25% of 800 = 200px, content = 200px → stays same
    refs.set('sec-2:0', createMockDiv(200))

    act(() => {
      useUIStore.getState().setPendingLayoutCommit(true)
    })

    renderHook(() =>
      useLayoutCommit({
        sectionRefs: refs,
        sectionLayouts: layouts,
        contentHeightPx: 800,
        zoom: 1,
      })
    )

    const updated = useLayoutStore.getState().pageLayout.sectionLayouts

    // sec-1 starts at Y=0, height = (100+4)/800*100 = 13%
    expect(updated[0].polygon[0][1]).toBeCloseTo(0, 0)
    expect(updated[0].polygon[2][1] - updated[0].polygon[0][1]).toBeCloseTo(13, 0)

    // sec-2 starts after sec-1 + gap (13 + 1 = 14%)
    expect(updated[1].polygon[0][1]).toBeCloseTo(14, 0)
  })

  it('should not modify layouts when no corrections are needed', () => {
    // Content fits perfectly
    const layouts: SectionLayout[] = [
      {
        sectionId: 'sec-1',
        polygon: [[0, 0], [100, 0], [100, 12.5], [0, 12.5]],
        columnCount: 1,
        pageIndex: 0,
      },
    ]

    act(() => {
      useLayoutStore.getState().setSectionLayouts(layouts)
    })

    const refs = new Map<string, HTMLDivElement | null>()
    // allocated = 12.5% of 800 = 100px, content = 100px → within threshold
    refs.set('sec-1:0', createMockDiv(100))

    act(() => {
      useUIStore.getState().setPendingLayoutCommit(true)
    })

    renderHook(() =>
      useLayoutCommit({
        sectionRefs: refs,
        sectionLayouts: layouts,
        contentHeightPx: 800,
        zoom: 1,
      })
    )

    // Layouts should remain unchanged
    const updated = useLayoutStore.getState().pageLayout.sectionLayouts
    expect(updated[0].polygon).toEqual(layouts[0].polygon)
  })
})
