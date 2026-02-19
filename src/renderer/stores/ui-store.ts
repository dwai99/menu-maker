import { create } from 'zustand'
import type { OverflowState } from '../layout/overflow'
import type { MenuData } from '../models/menu'
import type { PageLayout } from '../models/layout'

export interface DocumentTab {
  id: string
  filePath: string | null
  name: string       // "Untitled" or filename without .menu
  isDirty: boolean
  snapshot: { menuData: MenuData; pageLayout: PageLayout }
}

export type ViewMode = 'split' | 'editor' | 'preview'

interface UIStore {
  // Panel
  leftPanelWidth: number
  isLeftPanelCollapsed: boolean
  activeTab: 'content' | 'style' | 'page' | 'logo'
  viewMode: ViewMode
  setLeftPanelWidth: (width: number) => void
  setActiveTab: (tab: 'content' | 'style' | 'page' | 'logo') => void
  toggleLeftPanel: () => void
  setViewMode: (mode: ViewMode) => void

  // Selection (multi-select aware)
  selectedSectionId: string | null      // primary selection (for editor panel)
  selectedSectionIds: string[]          // all selected sections (for alignment)
  selectedItemId: string | null
  selectSection: (id: string | null) => void
  toggleSectionSelection: (id: string) => void  // Cmd/Ctrl+click
  selectItem: (sectionId: string, itemId: string | null) => void
  clearSelection: () => void

  // Zoom
  zoom: number
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void

  // Overflow detection
  overflowState: OverflowState | null
  setOverflowState: (state: OverflowState | null) => void

  // Auto-fit: incremented to trigger font auto-shrink in PagePreview
  autoFitCounter: number
  requestAutoFit: () => void

  // Multi-page
  activePageId: string | null
  previewLayout: 'stacked' | 'side-by-side'
  setActivePageId: (id: string | null) => void
  setPreviewLayout: (layout: 'stacked' | 'side-by-side') => void

  // Project state
  isDirty: boolean
  currentFilePath: string | null
  markDirty: () => void
  markClean: () => void
  setFilePath: (path: string | null) => void

  // Document tabs
  documentTabs: DocumentTab[]
  activeDocumentId: string | null
  addDocumentTab: (tab: DocumentTab) => void
  removeDocumentTab: (id: string) => void
  setActiveDocument: (id: string) => void
  updateDocumentTab: (id: string, updates: Partial<DocumentTab>) => void

  // Auto-save interval (seconds)
  autoSaveInterval: number
  setAutoSaveInterval: (seconds: number) => void

  // OCR progress
  ocrProgress: { active: boolean; progress: number; message: string }
  setOcrProgress: (progress: { active: boolean; progress: number; message: string }) => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.25
const DEFAULT_ZOOM = 0.75

export const useUIStore = create<UIStore>()((set, get) => ({
  // Panel
  leftPanelWidth: 400,
  isLeftPanelCollapsed: false,
  activeTab: 'content',
  viewMode: 'split',

  setLeftPanelWidth: (width: number) => {
    set({ leftPanelWidth: width })
  },

  setActiveTab: (tab: 'content' | 'style' | 'page' | 'logo') => {
    set({ activeTab: tab })
  },

  toggleLeftPanel: () => {
    set((state) => ({ isLeftPanelCollapsed: !state.isLeftPanelCollapsed }))
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode, isLeftPanelCollapsed: mode === 'preview' })
  },

  // Selection
  selectedSectionId: null,
  selectedSectionIds: [],
  selectedItemId: null,

  selectSection: (id: string | null) => {
    set({
      selectedSectionId: id,
      selectedSectionIds: id ? [id] : [],
      selectedItemId: null,
    })
  },

  toggleSectionSelection: (id: string) => {
    const current = get().selectedSectionIds
    const exists = current.includes(id)
    const next = exists ? current.filter((s) => s !== id) : [...current, id]
    set({
      selectedSectionIds: next,
      selectedSectionId: next.length > 0 ? next[next.length - 1] : null,
      selectedItemId: null,
    })
  },

  selectItem: (sectionId: string, itemId: string | null) => {
    set({
      selectedSectionId: sectionId,
      selectedSectionIds: [sectionId],
      selectedItemId: itemId,
    })
  },

  clearSelection: () => {
    set({
      selectedSectionId: null,
      selectedSectionIds: [],
      selectedItemId: null,
    })
  },

  // Zoom
  zoom: DEFAULT_ZOOM,

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    set({ zoom: clampedZoom })
  },

  zoomIn: () => {
    const currentZoom = get().zoom
    const newZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP)
    set({ zoom: newZoom })
  },

  zoomOut: () => {
    const currentZoom = get().zoom
    const newZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP)
    set({ zoom: newZoom })
  },

  resetZoom: () => {
    set({ zoom: DEFAULT_ZOOM })
  },

  // Overflow detection
  overflowState: null,

  setOverflowState: (state: OverflowState | null) => {
    set({ overflowState: state })
  },

  // Multi-page
  activePageId: null,
  previewLayout: 'side-by-side',

  setActivePageId: (id: string | null) => {
    set({ activePageId: id })
  },

  setPreviewLayout: (layout: 'stacked' | 'side-by-side') => {
    set({ previewLayout: layout })
  },

  // Project state
  isDirty: false,
  currentFilePath: null,

  // Auto-fit
  autoFitCounter: 0,

  requestAutoFit: () => {
    set((state) => ({ autoFitCounter: state.autoFitCounter + 1 }))
  },

  markDirty: () => {
    set({ isDirty: true })
  },

  markClean: () => {
    set({ isDirty: false })
  },

  setFilePath: (path: string | null) => {
    set({ currentFilePath: path })
  },

  // Document tabs
  documentTabs: [],
  activeDocumentId: null,

  addDocumentTab: (tab: DocumentTab) => {
    set((state) => ({
      documentTabs: [...state.documentTabs, tab],
      activeDocumentId: tab.id,
    }))
  },

  removeDocumentTab: (id: string) => {
    set((state) => {
      const filtered = state.documentTabs.filter((t) => t.id !== id)
      let nextActive = state.activeDocumentId
      if (state.activeDocumentId === id) {
        const idx = state.documentTabs.findIndex((t) => t.id === id)
        nextActive = filtered[Math.min(idx, filtered.length - 1)]?.id ?? null
      }
      return {
        documentTabs: filtered,
        activeDocumentId: nextActive,
      }
    })
  },

  setActiveDocument: (id: string) => {
    set({ activeDocumentId: id })
  },

  updateDocumentTab: (id: string, updates: Partial<DocumentTab>) => {
    set((state) => ({
      documentTabs: state.documentTabs.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
  },

  // Auto-save interval (default 60 seconds)
  autoSaveInterval: 60,

  setAutoSaveInterval: (seconds: number) => {
    const clamped = Math.max(10, Math.min(600, seconds))
    set({ autoSaveInterval: clamped })
    // Persist to electron settings
    window.electronAPI?.setSetting?.('autoSaveInterval', clamped)
  },

  // OCR progress
  ocrProgress: { active: false, progress: 0, message: '' },

  setOcrProgress: (progress) => {
    set({ ocrProgress: progress })
  },
}))
