import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui-store'
import { act } from '@testing-library/react'

describe('UI Store', () => {
    beforeEach(() => {
        act(() => {
            // Reset to defaults
            useUIStore.setState({
                leftPanelWidth: 400,
                activeTab: 'content',
                selectedSectionId: null,
                selectedSectionIds: [],
                selectedItemId: null,
                zoom: 0.75,
                overflowState: null,
                autoFitCounter: 0,
                activePageId: null,
                previewLayout: 'side-by-side',
                isDirty: false,
                currentFilePath: null,
            })
        })
    })

    // ── Panel Tests ───────────────────────────────────────────
    describe('Panel', () => {
        it('should have default panel width of 400', () => {
            expect(useUIStore.getState().leftPanelWidth).toBe(400)
        })

        it('should set left panel width', () => {
            act(() => useUIStore.getState().setLeftPanelWidth(500))
            expect(useUIStore.getState().leftPanelWidth).toBe(500)
        })

        it('should have default active tab as content', () => {
            expect(useUIStore.getState().activeTab).toBe('content')
        })

        it('should switch active tab', () => {
            act(() => useUIStore.getState().setActiveTab('style'))
            expect(useUIStore.getState().activeTab).toBe('style')

            act(() => useUIStore.getState().setActiveTab('page'))
            expect(useUIStore.getState().activeTab).toBe('page')
        })
    })

    // ── Selection Tests ───────────────────────────────────────
    describe('Selection', () => {
        it('should select a section', () => {
            act(() => useUIStore.getState().selectSection('sec-1'))
            const state = useUIStore.getState()
            expect(state.selectedSectionId).toBe('sec-1')
            expect(state.selectedSectionIds).toEqual(['sec-1'])
            expect(state.selectedItemId).toBeNull()
        })

        it('should deselect when selecting null', () => {
            act(() => useUIStore.getState().selectSection('sec-1'))
            act(() => useUIStore.getState().selectSection(null))
            const state = useUIStore.getState()
            expect(state.selectedSectionId).toBeNull()
            expect(state.selectedSectionIds).toEqual([])
        })

        it('should toggle section multi-selection', () => {
            act(() => useUIStore.getState().selectSection('sec-1'))
            act(() => useUIStore.getState().toggleSectionSelection('sec-2'))
            const state = useUIStore.getState()
            expect(state.selectedSectionIds).toEqual(['sec-1', 'sec-2'])
            expect(state.selectedSectionId).toBe('sec-2') // last added
        })

        it('should remove from multi-selection on toggle', () => {
            act(() => useUIStore.getState().selectSection('sec-1'))
            act(() => useUIStore.getState().toggleSectionSelection('sec-2'))
            act(() => useUIStore.getState().toggleSectionSelection('sec-1'))
            const state = useUIStore.getState()
            expect(state.selectedSectionIds).toEqual(['sec-2'])
            expect(state.selectedSectionId).toBe('sec-2')
        })

        it('should select an item and its parent section', () => {
            act(() => useUIStore.getState().selectItem('sec-1', 'item-1'))
            const state = useUIStore.getState()
            expect(state.selectedSectionId).toBe('sec-1')
            expect(state.selectedSectionIds).toEqual(['sec-1'])
            expect(state.selectedItemId).toBe('item-1')
        })

        it('should clear all selection', () => {
            act(() => useUIStore.getState().selectItem('sec-1', 'item-1'))
            act(() => useUIStore.getState().clearSelection())
            const state = useUIStore.getState()
            expect(state.selectedSectionId).toBeNull()
            expect(state.selectedSectionIds).toEqual([])
            expect(state.selectedItemId).toBeNull()
        })
    })

    // ── Zoom Tests ────────────────────────────────────────────
    describe('Zoom', () => {
        it('should have default zoom of 0.75', () => {
            expect(useUIStore.getState().zoom).toBe(0.75)
        })

        it('should zoom in by step (0.25)', () => {
            act(() => useUIStore.getState().zoomIn())
            expect(useUIStore.getState().zoom).toBe(1.0)
        })

        it('should zoom out by step', () => {
            act(() => useUIStore.getState().zoomOut())
            expect(useUIStore.getState().zoom).toBe(0.5)
        })

        it('should clamp zoom to max (2.0)', () => {
            act(() => useUIStore.getState().setZoom(5.0))
            expect(useUIStore.getState().zoom).toBe(2.0)
        })

        it('should clamp zoom to min (0.25)', () => {
            act(() => useUIStore.getState().setZoom(0.01))
            expect(useUIStore.getState().zoom).toBe(0.25)
        })

        it('should reset zoom to default', () => {
            act(() => useUIStore.getState().zoomIn())
            act(() => useUIStore.getState().zoomIn())
            act(() => useUIStore.getState().resetZoom())
            expect(useUIStore.getState().zoom).toBe(0.75)
        })

        it('should not zoom in past max', () => {
            // Zoom in many times
            for (let i = 0; i < 20; i++) {
                act(() => useUIStore.getState().zoomIn())
            }
            expect(useUIStore.getState().zoom).toBe(2.0)
        })

        it('should not zoom out past min', () => {
            for (let i = 0; i < 20; i++) {
                act(() => useUIStore.getState().zoomOut())
            }
            expect(useUIStore.getState().zoom).toBe(0.25)
        })
    })

    // ── Project State Tests ───────────────────────────────────
    describe('Project State', () => {
        it('should start clean', () => {
            expect(useUIStore.getState().isDirty).toBe(false)
        })

        it('should mark as dirty', () => {
            act(() => useUIStore.getState().markDirty())
            expect(useUIStore.getState().isDirty).toBe(true)
        })

        it('should mark as clean', () => {
            act(() => useUIStore.getState().markDirty())
            act(() => useUIStore.getState().markClean())
            expect(useUIStore.getState().isDirty).toBe(false)
        })

        it('should set file path', () => {
            act(() => useUIStore.getState().setFilePath('/test/file.menu'))
            expect(useUIStore.getState().currentFilePath).toBe('/test/file.menu')
        })

        it('should clear file path', () => {
            act(() => useUIStore.getState().setFilePath('/test/file.menu'))
            act(() => useUIStore.getState().setFilePath(null))
            expect(useUIStore.getState().currentFilePath).toBeNull()
        })
    })

    // ── Multi-page Tests ──────────────────────────────────────
    describe('Multi-page', () => {
        it('should set active page ID', () => {
            act(() => useUIStore.getState().setActivePageId('page-1'))
            expect(useUIStore.getState().activePageId).toBe('page-1')
        })

        it('should set preview layout', () => {
            act(() => useUIStore.getState().setPreviewLayout('stacked'))
            expect(useUIStore.getState().previewLayout).toBe('stacked')
        })
    })

    // ── Auto-fit Tests ────────────────────────────────────────
    describe('Auto-fit', () => {
        it('should increment autoFitCounter', () => {
            const initial = useUIStore.getState().autoFitCounter
            act(() => useUIStore.getState().requestAutoFit())
            expect(useUIStore.getState().autoFitCounter).toBe(initial + 1)
        })
    })
})
