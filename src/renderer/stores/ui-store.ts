import { create } from 'zustand'
import type { OverflowState } from '../layout/overflow'
import type { MenuData } from '../models/menu'
import type { PageLayout } from '../models/layout'
import type { LayoutView } from '../models/project'
import { useLayoutStore } from './layout-store'

export interface DocumentTab {
  id: string
  filePath: string | null
  name: string       // "Untitled" or filename without .menu
  isDirty: boolean
  snapshot: {
    menuData: MenuData
    pageLayout: PageLayout
    layoutViews?: LayoutView[]
    activeLayoutViewId?: string | null
  }
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
  selectedFragmentId: string | null     // specific fragment with resize handles
  selectedPageImageId: string | null    // selected page image overlay
  selectedTextFrameId: string | null    // selected text frame
  selectSection: (id: string | null) => void
  selectFragment: (fragmentId: string) => void
  toggleSectionSelection: (id: string) => void  // Cmd/Ctrl+click
  selectItem: (sectionId: string, itemId: string | null) => void
  selectPageImage: (id: string | null) => void
  selectTextFrame: (id: string | null) => void
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

  // What Changed baseline — snapshot of menuData at last save
  lastSavedMenuData: MenuData | null
  setLastSavedMenuData: (data: MenuData | null) => void

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

  // Layout commit flag — set true after auto-layout to trigger one-shot DOM measurement
  pendingLayoutCommit: boolean
  setPendingLayoutCommit: (pending: boolean) => void

  // OCR progress
  ocrProgress: { active: boolean; progress: number; message: string }
  setOcrProgress: (progress: { active: boolean; progress: number; message: string }) => void

  // Layout views
  layoutViews: LayoutView[]
  activeLayoutViewId: string | null
  setLayoutViews: (views: LayoutView[]) => void
  setActiveLayoutViewId: (id: string | null) => void
  syncActiveViewLayout: () => void
  switchLayoutView: (viewId: string) => void
  toggleViewSectionVisibility: (sectionId: string, viewId?: string) => void
  toggleViewItemVisibility: (itemId: string, viewId?: string) => void

  // Editor preferences (persisted to localStorage)
  showItemBadges: boolean
  showDietaryIcons: boolean
  showFeaturedItem: boolean
  showPriceVariants: boolean
  showCustomLayout: boolean
  defaultCurrency: string
  defaultZoom: number
  setShowItemBadges: (show: boolean) => void
  setShowDietaryIcons: (show: boolean) => void
  setShowFeaturedItem: (show: boolean) => void
  setShowPriceVariants: (show: boolean) => void
  setShowCustomLayout: (show: boolean) => void
  setDefaultCurrency: (currency: string) => void
  setDefaultZoom: (zoom: number) => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.25

// Preferences are persisted to settings.json via Electron IPC (main process).
// On startup we read synchronously from a cache; the real values are loaded
// asynchronously in initPreferences() and patched into the store.
const prefCache: Record<string, string> = {}
function loadPref(key: string, fallback: string): string {
  return prefCache[key] ?? fallback
}
function savePref(key: string, value: string) {
  prefCache[key] = value
  window.electronAPI?.setSetting?.(`pref:${key}`, value)
}

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
  selectedFragmentId: null,
  selectedPageImageId: null,
  selectedTextFrameId: null,

  selectSection: (id: string | null) => {
    set({
      selectedSectionId: id,
      selectedSectionIds: id ? [id] : [],
      selectedItemId: null,
      selectedFragmentId: null,
      selectedPageImageId: null,
      selectedTextFrameId: null,
    })
  },

  selectFragment: (fragmentId: string) => {
    // Derive sectionId from fragmentId (format: "sectionId:startItemIndex")
    const colonIdx = fragmentId.lastIndexOf(':')
    const sectionId = colonIdx !== -1 ? fragmentId.substring(0, colonIdx) : fragmentId
    set({
      selectedFragmentId: fragmentId,
      selectedSectionId: sectionId,
      selectedSectionIds: [sectionId],
      selectedItemId: null,
      selectedPageImageId: null,
      selectedTextFrameId: null,
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
      selectedPageImageId: null,
      selectedTextFrameId: null,
    })
  },

  selectPageImage: (id: string | null) => {
    set({
      selectedPageImageId: id,
      selectedSectionId: null,
      selectedSectionIds: [],
      selectedItemId: null,
      selectedFragmentId: null,
      selectedTextFrameId: null,
    })
  },

  selectTextFrame: (id: string | null) => {
    set({
      selectedTextFrameId: id,
      selectedSectionId: null,
      selectedSectionIds: [],
      selectedItemId: null,
      selectedFragmentId: null,
      selectedPageImageId: null,
    })
  },

  clearSelection: () => {
    set({
      selectedSectionId: null,
      selectedSectionIds: [],
      selectedItemId: null,
      selectedFragmentId: null,
      selectedPageImageId: null,
      selectedTextFrameId: null,
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

  // What Changed baseline
  lastSavedMenuData: null,

  setLastSavedMenuData: (data: MenuData | null) => {
    set({ lastSavedMenuData: data })
  },

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

  // Layout commit flag
  pendingLayoutCommit: false,

  setPendingLayoutCommit: (pending: boolean) => {
    set({ pendingLayoutCommit: pending })
  },

  // OCR progress
  ocrProgress: { active: false, progress: 0, message: '' },

  setOcrProgress: (progress) => {
    set({ ocrProgress: progress })
  },

  // Layout views
  layoutViews: [],
  activeLayoutViewId: null,
  setLayoutViews: (views) => set({ layoutViews: views }),
  setActiveLayoutViewId: (id) => set({ activeLayoutViewId: id }),

  syncActiveViewLayout: () => {
    const { layoutViews, activeLayoutViewId } = get()
    if (!activeLayoutViewId || layoutViews.length === 0) return
    const currentLayout = useLayoutStore.getState().pageLayout
    set({
      layoutViews: layoutViews.map(v =>
        v.id === activeLayoutViewId ? { ...v, pageLayout: currentLayout } : v
      ),
    })
  },

  switchLayoutView: (viewId: string) => {
    const { layoutViews, activeLayoutViewId } = get()
    if (viewId === activeLayoutViewId || layoutViews.length === 0) return
    // Save current layout back into departing view
    const currentLayout = useLayoutStore.getState().pageLayout
    const updated = layoutViews.map(v =>
      v.id === activeLayoutViewId ? { ...v, pageLayout: currentLayout } : v
    )
    const target = updated.find(v => v.id === viewId)
    if (!target) return
    set({ layoutViews: updated, activeLayoutViewId: viewId })
    useLayoutStore.getState().loadPageLayout(target.pageLayout)
    useLayoutStore.temporal.getState().clear()
  },

  toggleViewSectionVisibility: (sectionId, viewId?) => {
    const { layoutViews, activeLayoutViewId } = get()
    const targetId = viewId ?? activeLayoutViewId
    if (!targetId) return
    set({
      layoutViews: layoutViews.map(v => {
        if (v.id !== targetId) return v
        const hidden = v.hiddenSectionIds ?? []
        return {
          ...v,
          hiddenSectionIds: hidden.includes(sectionId)
            ? hidden.filter(id => id !== sectionId)
            : [...hidden, sectionId],
        }
      }),
    })
  },
  toggleViewItemVisibility: (itemId, viewId?) => {
    const { layoutViews, activeLayoutViewId } = get()
    const targetId = viewId ?? activeLayoutViewId
    if (!targetId) return
    set({
      layoutViews: layoutViews.map(v => {
        if (v.id !== targetId) return v
        const hidden = v.hiddenItemIds ?? []
        return {
          ...v,
          hiddenItemIds: hidden.includes(itemId)
            ? hidden.filter(id => id !== itemId)
            : [...hidden, itemId],
        }
      }),
    })
  },

  // Editor preferences (persisted to settings.json via Electron IPC)
  showItemBadges: false,
  showDietaryIcons: true,
  showFeaturedItem: false,
  showPriceVariants: true,
  showCustomLayout: true,
  defaultCurrency: '$',
  defaultZoom: DEFAULT_ZOOM,

  setShowItemBadges: (show) => { set({ showItemBadges: show }); savePref('showItemBadges', String(show)) },
  setShowDietaryIcons: (show) => { set({ showDietaryIcons: show }); savePref('showDietaryIcons', String(show)) },
  setShowFeaturedItem: (show) => { set({ showFeaturedItem: show }); savePref('showFeaturedItem', String(show)) },
  setShowPriceVariants: (show) => { set({ showPriceVariants: show }); savePref('showPriceVariants', String(show)) },
  setShowCustomLayout: (show) => { set({ showCustomLayout: show }); savePref('showCustomLayout', String(show)) },
  setDefaultCurrency: (currency) => { set({ defaultCurrency: currency }); savePref('defaultCurrency', currency) },
  setDefaultZoom: (zoom) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    set({ defaultZoom: clamped, zoom: clamped })
    savePref('defaultZoom', String(clamped))
  },
}))

// Load preferences from settings.json on startup (async)
const PREF_KEYS = [
  { key: 'showItemBadges', fallback: 'false', parse: (v: string) => v === 'true' },
  { key: 'showDietaryIcons', fallback: 'true', parse: (v: string) => v === 'true' },
  { key: 'showFeaturedItem', fallback: 'false', parse: (v: string) => v === 'true' },
  { key: 'showPriceVariants', fallback: 'true', parse: (v: string) => v === 'true' },
  { key: 'showCustomLayout', fallback: 'true', parse: (v: string) => v === 'true' },
  { key: 'defaultCurrency', fallback: '$', parse: (v: string) => v },
  { key: 'defaultZoom', fallback: '0.75', parse: (v: string) => Number(v) || 0.75 },
] as const

export async function initPreferences() {
  if (!window.electronAPI?.getSetting) return
  const updates: Record<string, any> = {}
  for (const { key, fallback, parse } of PREF_KEYS) {
    const raw = await window.electronAPI.getSetting(`pref:${key}`)
    const value = raw != null ? parse(String(raw)) : parse(fallback)
    updates[key] = value
    prefCache[key] = raw != null ? String(raw) : fallback
  }
  if (updates.defaultZoom) updates.zoom = updates.defaultZoom
  useUIStore.setState(updates)
}
