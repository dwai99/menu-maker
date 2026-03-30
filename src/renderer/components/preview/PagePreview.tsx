import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import { useDebouncedValue } from '@/hooks/useDebouncedStore'
import { PAGE_SIZES } from '@/models/layout'
import type { SectionLayout, ColumnCount, SectionDecoration, ColorScheme, BackgroundTexture, PageBorder, SectionDivider, Currency, VariantDisplayMode, VariantSeparator, SectionTitleDecoration, HeaderConfig, HeaderLayoutPreset, PricePosition } from '@/models/layout'
import { createDefaultHeaderConfig } from '@/models/layout'
import { DIETARY_ICON_META, ITEM_BADGE_META } from '@/models/menu'
import type { DietaryIcon, ItemBadge, PriceVariant, HeaderElementPosition, MenuItem, MenuSection } from '@/models/menu'
import { boundingBox } from '@/layout/polygon'
import { PolygonEditor } from './PolygonEditor'
import { DraggableImage } from './DraggableImage'
import { DraggableTextFrame } from './DraggableTextFrame'
import { computeAutoLayout } from '@/layout/auto-layout'
import { estimateHeaderHeight, estimateFooterHeight } from '@/layout/measure'
import { getFragmentId, findFragment, resizeFragment } from '@/layout/layout-engine'
import { getTriFoldFoldLinesByType, getTriFoldLineStyle } from '@/layout/tri-fold'
import { useLayoutCommit } from '@/hooks/useLayoutCommit'
import { useAutoShrinkFonts } from '@/hooks/useAutoShrinkFonts'
import { TRI_FOLD_FRONT_PANELS, TRI_FOLD_BACK_PANELS, TRI_FOLD_PANEL_LABELS } from '@/models/layout'
import type { TriFoldPanelRole } from '@/models/layout'

const DPI = 96 // 1 inch = 96px

/** Build CSS for background texture overlay */
function backgroundTextureStyle(texture: BackgroundTexture): React.CSSProperties {
  switch (texture) {
    case 'paper':
      return {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
      }
    case 'linen':
      return {
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)`,
      }
    case 'parchment':
      return {
        backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(139,69,19,0.04) 0%, transparent 70%), radial-gradient(ellipse at 80% 20%, rgba(139,69,19,0.03) 0%, transparent 60%)`,
      }
    case 'chalkboard':
      return {
        backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)`,
      }
    case 'marble':
      return {
        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.02) 25%, transparent 25%), linear-gradient(225deg, rgba(0,0,0,0.02) 25%, transparent 25%), linear-gradient(315deg, rgba(0,0,0,0.015) 25%, transparent 25%), linear-gradient(45deg, rgba(0,0,0,0.015) 25%, transparent 25%)`,
        backgroundSize: '40px 40px',
      }
    default:
      return {}
  }
}

/** Build CSS for page border/frame */
function pageBorderStyle(border: PageBorder, colors: ColorScheme): React.CSSProperties {
  switch (border) {
    case 'thin':
      return { border: `1px solid ${colors.border}` }
    case 'double':
      return { border: `3px double ${colors.border}` }
    case 'thick':
      return { border: `3px solid ${colors.border}` }
    case 'inset':
      return {
        border: `1px solid ${colors.border}`,
        boxShadow: `inset 0 0 0 4px ${colors.background}, inset 0 0 0 5px ${colors.border}`,
      }
    default:
      return {}
  }
}

/** Build CSS for section divider between sections */
function renderSectionDivider(divider: SectionDivider, colors: ColorScheme): React.ReactElement | null {
  if (divider === 'none') return null

  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 0',
    gap: '8px',
    color: colors.border,
    fontSize: '10pt',
  }

  switch (divider) {
    case 'line':
      return <div style={{ ...base, borderTop: `1px solid ${colors.border}`, margin: '8px 20%' }} />
    case 'dots':
      return (
        <div style={base}>
          <span style={{ letterSpacing: '4px' }}>...</span>
        </div>
      )
    case 'flourish':
      return (
        <div style={base}>
          <span style={{ width: '40px', height: '1px', backgroundColor: colors.border }} />
          <span style={{ fontSize: '12pt', color: colors.accent }}>&#10044;</span>
          <span style={{ width: '40px', height: '1px', backgroundColor: colors.border }} />
        </div>
      )
    case 'diamond':
      return (
        <div style={base}>
          <span style={{ width: '30px', height: '1px', backgroundColor: colors.border }} />
          <span style={{ fontSize: '8pt', color: colors.accent }}>&#9670;</span>
          <span style={{ width: '30px', height: '1px', backgroundColor: colors.border }} />
        </div>
      )
    case 'double-line':
      return (
        <div style={{ margin: '8px 15%' }}>
          <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: '2px' }} />
          <div style={{ borderTop: `1px solid ${colors.border}` }} />
        </div>
      )
    default:
      return null
  }
}

/** Render section title decoration element */
function renderSectionTitleDecoration(decoration: SectionTitleDecoration | undefined, accentColor: string): React.ReactElement | null {
  if (!decoration || decoration === 'none') return null

  switch (decoration) {
    case 'underline-solid':
      return (
        <div style={{ width: '60%', margin: '4px auto 0', height: '1px', backgroundColor: accentColor }} />
      )
    case 'underline-double':
      return (
        <div style={{ width: '60%', margin: '4px auto 0' }}>
          <div style={{ height: '1px', backgroundColor: accentColor, marginBottom: '3px' }} />
          <div style={{ height: '1px', backgroundColor: accentColor }} />
        </div>
      )
    case 'ornamental-flourish':
      return (
        <div style={{ textAlign: 'center', color: accentColor, fontSize: '10pt', marginTop: '4px' }}>
          &#10087; &#10086; &#10087;
        </div>
      )
    case 'ornamental-lines':
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', color: accentColor, fontSize: '9pt' }}>
          <span>──</span>
          <span>✦</span>
          <span>──</span>
        </div>
      )
    case 'ornamental-diamond':
      return (
        <div style={{ textAlign: 'center', color: accentColor, fontSize: '9pt', marginTop: '4px' }}>
          ◆
        </div>
      )
    default:
      return null
  }
}

/** Format price with currency symbol */
function formatPrice(price: string, priceLabel: string, currency: Currency): string {
  if (!price && !priceLabel) return ''
  const sym = currency === 'none' ? '' : currency
  if (priceLabel && price) {
    // If priceLabel contains digits, treat it as a full override (e.g. "Cup $5.50 / Bowl $8.50")
    if (/\d/.test(priceLabel)) return priceLabel
    // Otherwise append it to the formatted price (e.g. "per glass" → "$15.99 per glass")
    return `${sym}${price} ${priceLabel}`
  }
  if (priceLabel) return priceLabel
  return `${sym}${price}`
}

/** Format variant prices as inline string: "Half $9.99 / Full $14.99" */
function formatVariantsInline(variants: PriceVariant[], currency: Currency, separator: string = ' / '): string {
  const sym = currency === 'none' ? '' : currency
  const withPrices = variants.filter((v) => v.price)
  if (withPrices.length === 0) return ''
  return withPrices
    .map((v) => `${v.label} ${sym}${v.price}`.trim())
    .join(separator)
}

/** Build CSS properties for a single section decoration */
function singleDecorationStyle(decoration: SectionDecoration, colors: ColorScheme): React.CSSProperties {
  switch (decoration) {
    case 'border':
      return {
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
      }
    case 'shadow':
      return {
        borderRadius: '8px',
        boxShadow: `0 1px 3px 0 ${colors.border}80, 0 1px 2px -1px ${colors.border}60`,
      }
    case 'filled':
      return {
        backgroundColor: `${colors.accent}08`,
        border: `1px solid ${colors.border}40`,
        borderRadius: '6px',
      }
    case 'accent-left':
      return {
        borderLeft: `3px solid ${colors.accent}`,
        borderRadius: '2px',
      }
    default:
      return {}
  }
}

/** Build merged CSS properties for multiple section decorations */
function decorationStyle(decoration: SectionDecoration, colors: ColorScheme, decorations?: SectionDecoration[]): React.CSSProperties {
  const decs = decorations && decorations.length > 0 ? decorations : (decoration === 'none' ? [] : [decoration])
  if (decs.length === 0) return {}
  // Merge all decoration styles
  let merged: React.CSSProperties = {}
  for (const dec of decs) {
    const style = singleDecorationStyle(dec, colors)
    merged = { ...merged, ...style }
  }
  return merged
}

export const PagePreview: React.FC = () => {
  const rawMenuData = useMenuStore((state) => state.menuData)
  const setLogo = useMenuStore((state) => state.setLogo)
  const setTitlePosition = useMenuStore((state) => state.setTitlePosition)
  const setSubtitlePosition = useMenuStore((state) => state.setSubtitlePosition)
  const setDividerPosition = useMenuStore((state) => state.setDividerPosition)
  const updatePageImage = useMenuStore((state) => state.updatePageImage)
  const updateTextFrame = useMenuStore((state) => state.updateTextFrame)
  // pageLayout is NOT debounced — it contains section layouts, column counts,
  // and positions that need instant feedback during drag/resize/auto-layout.
  const pageLayout = useLayoutStore((state) => state.pageLayout)
  const setFragmentLayout = useLayoutStore((state) => state.setFragmentLayout)
  const setSectionLayouts = useLayoutStore((state) => state.setSectionLayouts)

  // Only debounce menu content (text, items, descriptions) to prevent
  // re-rendering the preview on every keystroke while typing.
  const menuData = useDebouncedValue(rawMenuData, 150)

  const {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    selectedSectionId,
    selectedSectionIds,
    selectedItemId,
    selectedFragmentId,
    selectSection,
    selectFragment,
    selectItem,
    toggleSectionSelection,
    selectedPageImageId,
    selectPageImage,
    selectedTextFrameId,
    selectTextFrame,
    markDirty,
    overflowState,
    previewLayout,
    setPreviewLayout,
    setPendingLayoutCommit,
    layoutViews,
    activeLayoutViewId,
  } = useUIStore()

  // Per-view visibility filtering
  const activeView = layoutViews.find(v => v.id === activeLayoutViewId)
  const hiddenSectionIds = activeView?.hiddenSectionIds ?? []
  const hiddenItemIds = activeView?.hiddenItemIds ?? []

  const [isDragging, setIsDragging] = useState(false)
  const [logoSelected, setLogoSelected] = useState(false)

  // Memoize page dimension calculations — these depend only on layout config and
  // zoom, so they only recompute when those values actually change.
  const {
    pageWidthPx,
    pageHeightPx,
    scaledPageWidth,
    scaledPageHeight,
    contentWidthPx,
    contentHeightPx,
  } = useMemo(() => {
    const pageSize = PAGE_SIZES[pageLayout.pageSize]
    const pageWidthInches = pageLayout.orientation === 'portrait' ? pageSize.width : pageSize.height
    const pageHeightInches = pageLayout.orientation === 'portrait' ? pageSize.height : pageSize.width
    const pageWidthPx = pageWidthInches * DPI
    const pageHeightPx = pageHeightInches * DPI
    return {
      pageWidthPx,
      pageHeightPx,
      scaledPageWidth: pageWidthPx * zoom,
      scaledPageHeight: pageHeightPx * zoom,
      contentWidthPx: pageWidthPx - (pageLayout.margins.left + pageLayout.margins.right) * DPI,
      contentHeightPx: pageHeightPx - (pageLayout.margins.top + pageLayout.margins.bottom) * DPI,
    }
  }, [pageLayout.pageSize, pageLayout.orientation, pageLayout.margins, zoom])

  // Check if any sections have explicit layouts (absolute positioning mode)
  const hasAnyExplicitLayouts = useMemo(
    () => (pageLayout.sectionLayouts?.length ?? 0) > 0,
    [pageLayout.sectionLayouts]
  )

  // Estimate header/footer heights for per-page container sizing
  const estimatedHeaderH = useMemo(
    () => estimateHeaderHeight(menuData, pageLayout.typography),
    [menuData, pageLayout.typography]
  )
  const estimatedFooterH = useMemo(
    () => estimateFooterHeight(menuData.footer, pageLayout.typography),
    [menuData.footer, pageLayout.typography]
  )

  // Per-page sections container height: subtract header (first page) and footer (last page)
  // In tri-fold mode, header/footer are suppressed so full content height is available.
  const isTriFold = !!pageLayout.triFold?.enabled
  const getContainerHeight = useCallback(
    (isFirstPage: boolean, isLastPage: boolean): number | undefined => {
      if (!hasAnyExplicitLayouts) return undefined
      let h = contentHeightPx
      if (!isTriFold) {
        if (isFirstPage) h -= estimatedHeaderH
        if (isLastPage) h -= estimatedFooterH
      }
      return h
    },
    [hasAnyExplicitLayouts, contentHeightPx, estimatedHeaderH, estimatedFooterH, isTriFold]
  )

  // Default (first+last page) for backward-compatible single-page use
  const sectionsContainerHeight = useMemo(
    () => getContainerHeight(true, true),
    [getContainerHeight]
  )

  // Total layout pages (derived from sectionLayouts) — used for per-page height in renderSectionFragment
  const totalLayoutPages = useMemo(
    () => Math.max(1, ...((pageLayout.sectionLayouts || []).map(sl => (sl.pageIndex ?? 0) + 1))),
    [pageLayout.sectionLayouts]
  )

  // Which page the selected fragment is on (for z-index elevation)
  const selectedFragmentPageIdx = useMemo(() => {
    if (!selectedFragmentId) return -1
    const frag = findFragment(selectedFragmentId, pageLayout.sectionLayouts || [])
    return frag?.pageIndex ?? -1
  }, [selectedFragmentId, pageLayout.sectionLayouts])

  // Ref for sections container
  const sectionsRef = useRef<HTMLDivElement>(null)

  // Refs for individual section fragments (for layout correction)
  const sectionRefsMap = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const getSectionRefCallback = useCallback(
    (fragmentId: string) => (el: HTMLDivElement | null) => {
      sectionRefsMap.current.set(fragmentId, el)
    },
    []
  )

  // Auto-shrink fonts when content overflows and the feature is enabled
  useAutoShrinkFonts()

  // Layout commit: one-shot measurement after auto-layout writes corrections to the store
  useLayoutCommit({
    sectionRefs: sectionRefsMap.current,
    sectionLayouts: pageLayout.sectionLayouts || [],
    contentHeightPx: sectionsContainerHeight ?? contentHeightPx,
    zoom,
  })

  // Compute column grid lines for snap-to-grid editing
  const columnGridLines = useMemo(() => {
    const gridCols = Math.max(1, pageLayout.columnCount || 1)
    if (gridCols <= 1) return [0, 100]
    const hGapPx = 16
    const totalHGapPx = (gridCols - 1) * hGapPx
    const colWidthPx = (contentWidthPx - totalHGapPx) / gridCols
    const colWidthPct = (colWidthPx / contentWidthPx) * 100
    const hGapPct = contentWidthPx > 0 ? (hGapPx / contentWidthPx) * 100 : 0
    const lines: number[] = [0]
    for (let c = 0; c < gridCols; c++) {
      const colEnd = c * (colWidthPct + hGapPct) + colWidthPct
      lines.push(colEnd)
      if (c < gridCols - 1) {
        lines.push(colEnd + hGapPct) // start of next column
      }
    }
    lines.push(100)
    return lines
  }, [pageLayout.columnCount, contentWidthPx])

  // Get or create section layout
  const getOrCreateSectionLayout = useCallback(
    (sectionId: string): SectionLayout => {
      const existing = pageLayout.sectionLayouts?.find((sl) => sl.sectionId === sectionId)
      if (existing) return existing

      // Default: full-width polygon (flow layout)
      return {
        sectionId,
        polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
        columnCount: 1,
        pageIndex: 0,
      }
    },
    [pageLayout.sectionLayouts]
  )

  // Handle section resize completion — auto-split overflowing items into
  // a continuation fragment, or absorb items back when section is expanded.
  // IMPORTANT: Reads sectionLayouts from the store at call time (not from
  // the closure) because the polygon changes during drag and the closure
  // would hold stale pre-drag values, undoing the resize.
  // NOTE: Also called after drag completion to trigger layout correction.
  const handleResizeEnd = useCallback(
    (fragmentId: string, sectionId: string) => {
      const section = menuData.sections.find(s => s.id === sectionId)
      if (!section || (section.items || []).length === 0) return

      // Read LATEST layouts from the store — the closure value is stale
      // because the polygon was updated on every mousemove during drag.
      const currentLayouts = useLayoutStore.getState().pageLayout.sectionLayouts || []

      // Compute per-page container height for this fragment
      const frag = findFragment(fragmentId, currentLayouts)
      const pageIdx = frag?.pageIndex ?? 0
      const totalPages = Math.max(1, ...currentLayouts.map(sl => (sl.pageIndex ?? 0) + 1))
      const effectiveHeight = getContainerHeight(pageIdx === 0, pageIdx === totalPages - 1) || contentHeightPx

      const newLayouts = resizeFragment({
        fragmentId,
        section,
        allLayouts: currentLayouts,
        typography: pageLayout.typography,
        itemSeparator: pageLayout.itemSeparator,
        contentWidthPx,
        effectiveHeightPx: effectiveHeight,
        variantDisplayMode: pageLayout.variantDisplayMode,
      })

      setSectionLayouts(newLayouts)
      markDirty()
    },
    [menuData.sections, pageLayout.typography, pageLayout.itemSeparator, pageLayout.variantDisplayMode, contentWidthPx, contentHeightPx, getContainerHeight, setSectionLayouts, markDirty]
  )

  // Drag handler for moving sections (translates all polygon vertices)
  const handleDragStart = useCallback(
    (e: React.MouseEvent, sectionId: string, fragmentId: string) => {
      e.preventDefault()
      e.stopPropagation()

      selectFragment(fragmentId)

      const startX = e.clientX
      const startY = e.clientY
      // Use fragmentId to find the exact fragment (not just the first with this sectionId)
      const layout = findFragment(fragmentId, pageLayout.sectionLayouts || []) ?? getOrCreateSectionLayout(sectionId)

      // Polygon data is the single source of truth — no correction snapping needed
      const startPolygon = layout.polygon.map(v => [...v] as [number, number])

      setIsDragging(true)

      // Compute bounding box dimensions of the (possibly corrected) polygon for clamping
      const startBbox = boundingBox(startPolygon)

      // Compute container height for this fragment's page
      const pageIdx = layout.pageIndex ?? 0
      const totalPages = Math.max(1, ...((pageLayout.sectionLayouts || []).map(sl => (sl.pageIndex ?? 0) + 1)))
      const isFirst = pageIdx === 0
      const isLast = pageIdx === totalPages - 1
      const effectiveHeight = getContainerHeight(isFirst, isLast) || contentHeightPx

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (effectiveHeight * zoom)) * 100

        // Clamp so the bounding box stays within 0-100% on both axes
        const clampedDx = Math.max(-startBbox.x, Math.min(100 - (startBbox.x + startBbox.width), dx))
        const clampedDy = Math.max(-startBbox.y, Math.min(100 - (startBbox.y + startBbox.height), dy))

        const newPolygon = startPolygon.map(([vx, vy]) => [vx + clampedDx, vy + clampedDy] as [number, number])

        setFragmentLayout(fragmentId, { polygon: newPolygon })
        markDirty()
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [contentWidthPx, contentHeightPx, getContainerHeight, zoom, setFragmentLayout, markDirty, selectFragment, getOrCreateSectionLayout, pageLayout.sectionLayouts]
  )

  // Section click handler — Cmd/Ctrl+click toggles multi-select
  const handleSectionClick = useCallback(
    (e: React.MouseEvent, sectionId: string, fragmentId?: string) => {
      e.stopPropagation()
      if (e.metaKey || e.ctrlKey) {
        toggleSectionSelection(sectionId)
      } else if (fragmentId) {
        selectFragment(fragmentId)
      } else {
        selectSection(sectionId)
      }
    },
    [selectSection, selectFragment, toggleSectionSelection]
  )

  // Logo drag handler
  const handleLogoDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setLogoSelected(true)
      selectSection(null)

      const logo = menuData.logo
      if (!logo) return

      const startX = e.clientX
      const startY = e.clientY
      const startLogoX = logo.x
      const startLogoY = logo.y

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100

        const newX = Math.max(0, Math.min(100, startLogoX + dx))
        const newY = Math.max(0, Math.min(100, startLogoY + dy))

        setLogo({ ...logo, x: newX, y: newY })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [menuData.logo, contentWidthPx, contentHeightPx, zoom, setLogo, markDirty, selectSection]
  )

  // Title drag handler
  const handleTitleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Determine current position — use existing or convert from static default
      const currentPos: HeaderElementPosition = menuData.titlePosition ?? { x: 50, y: 0, width: 80 }

      const startX = e.clientX
      const startY = e.clientY
      const startPosX = currentPos.x
      const startPosY = currentPos.y

      // Set initial position when converting from static for the first time
      if (!menuData.titlePosition) {
        setTitlePosition(currentPos)
        markDirty()
      }

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100

        const newX = Math.max(0, Math.min(100, startPosX + dx))
        const newY = Math.max(0, Math.min(100, startPosY + dy))

        setTitlePosition({ ...currentPos, x: newX, y: newY })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [menuData.titlePosition, contentWidthPx, contentHeightPx, zoom, setTitlePosition, markDirty]
  )

  // Subtitle drag handler
  const handleSubtitleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Determine current position — use existing or convert from static default
      const currentPos: HeaderElementPosition = menuData.subtitlePosition ?? { x: 50, y: 5, width: 80 }

      const startX = e.clientX
      const startY = e.clientY
      const startPosX = currentPos.x
      const startPosY = currentPos.y

      // Set initial position when converting from static for the first time
      if (!menuData.subtitlePosition) {
        setSubtitlePosition(currentPos)
        markDirty()
      }

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100

        const newX = Math.max(0, Math.min(100, startPosX + dx))
        const newY = Math.max(0, Math.min(100, startPosY + dy))

        setSubtitlePosition({ ...currentPos, x: newX, y: newY })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [menuData.subtitlePosition, contentWidthPx, contentHeightPx, zoom, setSubtitlePosition, markDirty]
  )

  // Divider drag handler
  const handleDividerDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const currentPos: HeaderElementPosition = menuData.dividerPosition ?? { x: 50, y: 10, width: 60 }

      const startX = e.clientX
      const startY = e.clientY
      const startPosX = currentPos.x
      const startPosY = currentPos.y

      if (!menuData.dividerPosition) {
        setDividerPosition(currentPos)
        markDirty()
      }

      const handleMouseMove = (moveE: MouseEvent) => {
        const dx = ((moveE.clientX - startX) / (contentWidthPx * zoom)) * 100
        const dy = ((moveE.clientY - startY) / (contentHeightPx * zoom)) * 100

        const newX = Math.max(0, Math.min(100, startPosX + dx))
        const newY = Math.max(0, Math.min(100, startPosY + dy))

        setDividerPosition({ ...currentPos, x: newX, y: newY })
        markDirty()
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [menuData.dividerPosition, contentWidthPx, contentHeightPx, zoom, setDividerPosition, markDirty]
  )

  // Deselect when clicking page background
  const handlePageClick = useCallback(() => {
    selectSection(null)
    setLogoSelected(false)
    selectPageImage(null)
    selectTextFrame(null)
  }, [selectSection, selectPageImage, selectTextFrame])

  // Page image update handler (wraps store update + dirty flag)
  const handlePageImageUpdate = useCallback(
    (imageId: string, updates: Partial<import('@/models/menu').PageImage>) => {
      updatePageImage(imageId, updates)
      markDirty()
    },
    [updatePageImage, markDirty]
  )

  const handlePageImageSelect = useCallback(
    (imageId: string) => {
      selectPageImage(imageId)
      setLogoSelected(false)
    },
    [selectPageImage]
  )

  // Text frame handlers
  const handleTextFrameUpdate = useCallback(
    (frameId: string, updates: Partial<import('@/models/menu').TextFrame>) => {
      updateTextFrame(frameId, updates)
      markDirty()
    },
    [updateTextFrame, markDirty]
  )

  const handleTextFrameContentUpdate = useCallback(
    (frameId: string, content: string) => {
      updateTextFrame(frameId, { content })
      markDirty()
    },
    [updateTextFrame, markDirty]
  )

  const handleTextFrameSelect = useCallback(
    (frameId: string) => {
      selectTextFrame(frameId)
      setLogoSelected(false)
    },
    [selectTextFrame]
  )

  // Overflow action: shrink all fonts by 10%
  const handleShrinkFonts = useCallback(() => {
    const typography = pageLayout.typography
    const layoutStore = useLayoutStore.getState()
    for (const role of Object.keys(typography) as (keyof typeof typography)[]) {
      const current = typography[role]
      layoutStore.setTypography(role, { fontSize: Math.max(6, Math.round(current.fontSize * 0.9)) })
    }
    markDirty()
  }, [pageLayout.typography, markDirty])

  // Overflow action: bump page column count by 1 and recalculate layouts
  const handleAddColumns = useCallback(() => {
    const current = pageLayout.columnCount || 1
    if (current < 6) {
      const store = useLayoutStore.getState()
      store.updateLayout('columnCount', (current + 1) as ColumnCount)
      // Recalculate layouts with the new column count to avoid stale split fragments
      const updatedLayout = useLayoutStore.getState().pageLayout
      const result = computeAutoLayout({
        sections: menuData.sections || [],
        pageLayout: updatedLayout,
        menuData,
      })
      setSectionLayouts(result.sectionLayouts)
      setPendingLayoutCommit(true)
      markDirty()
    }
  }, [pageLayout.columnCount, menuData, setSectionLayouts, setPendingLayoutCommit, markDirty])

  // Overflow action: switch to multi-page flow layout
  const handleMultiPage = useCallback(() => {
    const result = computeAutoLayout({
      sections: menuData.sections || [],
      pageLayout,
      menuData,
    })
    setSectionLayouts(result.sectionLayouts)
    setPendingLayoutCommit(true)
    markDirty()
  }, [menuData, pageLayout, setSectionLayouts, setPendingLayoutCommit, markDirty])

  // Render item separator
  const renderSeparator = useCallback(() => {
    const separatorType = pageLayout.itemSeparator

    if (separatorType === 'none') return null

    const style: React.CSSProperties = {
      margin: '8px 0',
      border: 'none',
      height: '1px',
    }

    switch (separatorType) {
      case 'line':
        style.backgroundColor = pageLayout.colorScheme.border
        return <hr style={style} />
      case 'dots':
        style.backgroundImage = `radial-gradient(circle, ${pageLayout.colorScheme.border} 1px, transparent 1px)`
        style.backgroundSize = '4px 1px'
        style.backgroundRepeat = 'repeat-x'
        style.height = '1px'
        return <hr style={style} />
      case 'dashes':
        style.backgroundImage = `linear-gradient(to right, ${pageLayout.colorScheme.border} 50%, transparent 50%)`
        style.backgroundSize = '8px 1px'
        style.backgroundRepeat = 'repeat-x'
        return <hr style={style} />
      default:
        return null
    }
  }, [pageLayout.itemSeparator, pageLayout.colorScheme.border])

  // Render a single menu item
  const renderItem = useCallback(
    (item: MenuItem, sectionId: string) => {
      const isSelected = selectedItemId === item.id
      const itemNameStyle = pageLayout.typography.itemName
      const itemDescStyle = pageLayout.typography.itemDescription
      const itemPriceStyle = pageLayout.typography.itemPrice
      const priceFormat = pageLayout.priceFormat
      const pricePosition: PricePosition = item.pricePosition ?? pageLayout.pricePosition ?? 'inline'

      const colorScheme = pageLayout.colorScheme
      const highlightBg = item.isHighlighted ? `${colorScheme.accent}10` : undefined

      // Scale item spacing proportionally to font size
      const itemGap = Math.max(4, Math.round(itemNameStyle.fontSize * 0.65))

      const itemContainerStyle: React.CSSProperties = {
        marginBottom: `${itemGap}px`,
        opacity: 1,
        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : (highlightBg || 'transparent'),
        padding: isSelected || item.isHighlighted ? '4px' : '0',
        borderRadius: '4px',
        breakInside: 'avoid',
      }

      // --- Compute prices and variants early so styles can reference them ---
      const hasVariants = item.variants && item.variants.length > 0
      const variantMode: VariantDisplayMode = pageLayout.variantDisplayMode || 'inline'
      const separatorChar = pageLayout.variantSeparator || '/'
      const separatorStr = ` ${separatorChar} `
      const variantPriceText = hasVariants && variantMode === 'inline'
        ? formatVariantsInline(item.variants!, pageLayout.currency || '$', separatorStr)
        : ''
      const basePriceText = formatPrice(item.price, item.priceLabel, pageLayout.currency || '$')

      // When inline variants exist, they replace the base price entirely
      const priceText = variantPriceText || basePriceText
      const showPriceOnNameRow = pricePosition !== 'below' && !(hasVariants && variantMode === 'stacked')
      const hasContent = item.description || pricePosition === 'below'

      const nameRowStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: pricePosition === 'below' ? 'flex-start' : (priceFormat === 'right-aligned' ? 'space-between' : 'flex-start'),
        alignItems: pricePosition === 'below' ? 'center' : (priceFormat === 'dot-leaders' ? 'baseline' : 'center'),
        gap: pricePosition === 'below' ? '0' : (priceFormat === 'inline' ? '8px' : '0'),
        marginBottom: hasContent ? '2px' : '0',
      }

      const nameStyle: React.CSSProperties = {
        fontFamily: itemNameStyle.fontFamily,
        fontSize: `${itemNameStyle.fontSize}pt`,
        fontWeight: itemNameStyle.fontWeight,
        letterSpacing: `${itemNameStyle.letterSpacing}px`,
        lineHeight: itemNameStyle.lineHeight,
        textTransform: itemNameStyle.textTransform as any,
        textAlign: itemNameStyle.textAlign as any,
        color: itemNameStyle.color || pageLayout.colorScheme.text,
        flex: priceFormat === 'dot-leaders' ? '0 0 auto' : '1 1 auto',
        minWidth: 0,
      }

      const priceStyle: React.CSSProperties = {
        fontFamily: itemPriceStyle.fontFamily,
        fontSize: `${itemPriceStyle.fontSize}pt`,
        fontWeight: itemPriceStyle.fontWeight,
        letterSpacing: `${itemPriceStyle.letterSpacing}px`,
        lineHeight: itemPriceStyle.lineHeight,
        textTransform: itemPriceStyle.textTransform as any,
        color: pageLayout.colorScheme.price || pageLayout.colorScheme.accent,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }

      const leaderStyle: React.CSSProperties = {
        flex: '1 1 auto',
        borderBottom: `1px dotted ${pageLayout.colorScheme.border}`,
        margin: '0 8px',
        minWidth: '20px',
      }

      const descStyle: React.CSSProperties = {
        fontFamily: itemDescStyle.fontFamily,
        fontSize: `${itemDescStyle.fontSize}pt`,
        fontWeight: itemDescStyle.fontWeight,
        letterSpacing: `${itemDescStyle.letterSpacing}px`,
        lineHeight: itemDescStyle.lineHeight,
        color: itemDescStyle.color || pageLayout.colorScheme.text,
        marginTop: '2px',
      }

      // Custom render — user-authored free-form HTML replaces structured layout.
      // The HTML contains its own inline styles (generated to match the
      // structured render exactly). Content is user-authored in this desktop
      // Electron app, not untrusted external data.
      const handleItemClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        selectItem(sectionId, item.id)
      }

      if (item.customRender) {
        return (
          <div key={item.id} style={itemContainerStyle} onClick={handleItemClick}>
            <div dangerouslySetInnerHTML={{ __html: item.customRender }} />
          </div>
        )
      }

      return (
        <div key={item.id} style={itemContainerStyle} onClick={handleItemClick}>
          <div style={nameRowStyle}>
            <span style={nameStyle}>{item.name}</span>
            {/* Dietary icons inline after name */}
            {item.dietaryIcons && item.dietaryIcons.length > 0 && (
              <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '6px', flexShrink: 0 }}>
                {item.dietaryIcons.map((icon: DietaryIcon) => {
                  const meta = DIETARY_ICON_META[icon]
                  return (
                    <span
                      key={icon}
                      title={meta.label}
                      style={{
                        fontSize: '7pt',
                        fontWeight: 700,
                        color: meta.color,
                        border: `1px solid ${meta.color}`,
                        borderRadius: '2px',
                        padding: '0 2px',
                        lineHeight: 1.4,
                      }}
                    >
                      {meta.abbr}
                    </span>
                  )
                })}
              </span>
            )}
            {/* Badges inline after dietary icons */}
            {item.badges && item.badges.length > 0 && (
              <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '4px', flexShrink: 0 }}>
                {item.badges.map((badge: ItemBadge) => {
                  const meta = ITEM_BADGE_META[badge]
                  return (
                    <span
                      key={badge}
                      style={{
                        backgroundColor: meta.bgColor,
                        color: meta.color,
                        fontSize: '8px',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {meta.abbr}
                    </span>
                  )
                })}
              </span>
            )}
            {showPriceOnNameRow && priceFormat === 'dot-leaders' && priceText && <div style={leaderStyle} />}
            {showPriceOnNameRow && priceText && (
              <span style={priceStyle}>{priceText}</span>
            )}
          </div>

          {/* Price below name row */}
          {pricePosition === 'below' && priceText && (
            <div style={{
              display: 'flex',
              alignItems: priceFormat === 'right-aligned' ? 'flex-end' : 'flex-start',
              marginTop: '1px',
            }}>
              <span style={priceStyle}>{priceText}</span>
            </div>
          )}

          {/* Stacked variant rows */}
          {hasVariants && variantMode === 'stacked' && (
            <div style={{ marginTop: '1px' }}>
              {item.variants!.filter((v: PriceVariant) => v.price).map((v: PriceVariant) => {
                const sym = (pageLayout.currency || '$') === 'none' ? '' : (pageLayout.currency || '$')
                const stackedVariantPrice = `${sym}${v.price}`
                return (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      justifyContent: priceFormat === 'right-aligned' ? 'space-between' : 'flex-start',
                      alignItems: priceFormat === 'dot-leaders' ? 'baseline' : 'center',
                      gap: priceFormat === 'inline' ? '8px' : '0',
                      paddingLeft: '10px',
                    }}
                  >
                    <span style={{
                      fontFamily: itemPriceStyle.fontFamily,
                      fontSize: `${Math.max(7, itemPriceStyle.fontSize - 1)}pt`,
                      fontWeight: 400,
                      color: itemNameStyle.color || pageLayout.colorScheme.text,
                      flex: priceFormat === 'dot-leaders' ? '0 0 auto' : undefined,
                    }}>
                      {v.label}
                    </span>
                    {priceFormat === 'dot-leaders' && <div style={leaderStyle} />}
                    <span style={priceStyle}>{stackedVariantPrice}</span>
                  </div>
                )
              })}
            </div>
          )}

          {item.description && <div style={descStyle}>{item.description}</div>}

          {item.tags && item.tags.length > 0 && (
            <div style={{ marginTop: '3px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {item.tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '8pt',
                    padding: '2px 6px',
                    backgroundColor: pageLayout.colorScheme.accent,
                    color: pageLayout.colorScheme.background,
                    borderRadius: '3px',
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {renderSeparator()}
        </div>
      )
    },
    [
      selectedItemId,
      pageLayout.typography,
      pageLayout.priceFormat,
      pageLayout.pricePosition,
      pageLayout.colorScheme,
      pageLayout.currency,
      pageLayout.variantDisplayMode,
      pageLayout.variantSeparator,
      pageLayout.sectionTitleDecoration,
      renderSeparator,
      selectItem,
    ]
  )

  // Render section content (items + header + footnote)
  // Supports section splitting: startItemIndex/endItemIndex control which items to render.
  // Header is skipped for continuation fragments (startItemIndex > 0).
  // Footnote is only shown on the last fragment.
  const renderSectionContent = useCallback(
    (section: MenuSection, layout: SectionLayout) => {
      const sectionTitleStyle = pageLayout.typography.sectionTitle
      const sectionSubtitleStyle = pageLayout.typography.sectionSubtitle

      const startIdx = layout.startItemIndex ?? 0
      const unfilteredItems = section.items || []
      const totalCount = unfilteredItems.length

      // Safety: if endItemIndex is set, verify a continuation fragment exists.
      // If no continuation covers the remaining items, ignore endItemIndex to
      // prevent items from silently disappearing.
      let endIdx = layout.endItemIndex ?? totalCount
      if (layout.endItemIndex != null && layout.endItemIndex < totalCount) {
        const layouts = pageLayout.sectionLayouts || []
        const hasContinuation = layouts.some(
          (sl) => sl.sectionId === layout.sectionId && (sl.startItemIndex ?? 0) > startIdx
        )
        if (!hasContinuation) {
          endIdx = totalCount // No continuation — show all remaining items
        }
      }

      // Slice BEFORE filtering: endItemIndex was computed against unfiltered items
      const visibleItems = unfilteredItems.slice(startIdx, endIdx).filter((item: MenuItem) => item.isAvailable !== false && !hiddenItemIds.includes(item.id))
      const isFirstFragment = startIdx === 0
      const isLastFragment = endIdx >= totalCount

      const headerStyle: React.CSSProperties = {
        cursor: isDragging ? 'grabbing' : 'grab',
        padding: '6px 10px',
        borderBottom: `1px solid ${pageLayout.colorScheme.border}`,
        userSelect: 'none',
      }

      const hasSubtitleContent = !!section.subtitle

      const titleStyle: React.CSSProperties = {
        fontFamily: sectionTitleStyle.fontFamily,
        fontSize: `${sectionTitleStyle.fontSize}pt`,
        fontWeight: sectionTitleStyle.fontWeight,
        letterSpacing: `${sectionTitleStyle.letterSpacing}px`,
        lineHeight: sectionTitleStyle.lineHeight,
        textTransform: sectionTitleStyle.textTransform as any,
        textAlign: sectionTitleStyle.textAlign as any,
        color: pageLayout.colorScheme.sectionTitle || pageLayout.colorScheme.accent,
        marginBottom: hasSubtitleContent ? '4px' : '0',
      }

      const subtitleStyle: React.CSSProperties = {
        fontFamily: sectionSubtitleStyle.fontFamily,
        fontSize: `${sectionSubtitleStyle.fontSize}pt`,
        fontWeight: sectionSubtitleStyle.fontWeight,
        letterSpacing: `${sectionSubtitleStyle.letterSpacing}px`,
        lineHeight: sectionSubtitleStyle.lineHeight,
        textTransform: sectionSubtitleStyle.textTransform as any,
        color: sectionSubtitleStyle.color || pageLayout.colorScheme.text,
      }

      const itemsContainerStyle: React.CSSProperties = {
        padding: '10px 12px',
      }

      return (
        <>
          {/* Header — only on first fragment */}
          {isFirstFragment && (
            <div
              style={headerStyle}
              onMouseDown={(e) => handleDragStart(e, section.id, getFragmentId(layout))}
            >
              {section.title && (
                <div style={titleStyle}>
                  {section.icon ? `${section.icon} ` : ''}{section.title}
                </div>
              )}
              {renderSectionTitleDecoration(pageLayout.sectionTitleDecoration, pageLayout.colorScheme.accent)}
              {section.subtitle && <div style={subtitleStyle}>{section.subtitle}</div>}
              {/* Drag grip dots — hidden during export */}
              {hasAnyExplicitLayouts && (
                <div data-editor-only style={{
                  position: 'absolute', top: '4px', right: '4px',
                  opacity: 0.3, display: 'grid', gridTemplateColumns: '4px 4px',
                  gap: '2px', pointerEvents: 'none',
                }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: pageLayout.colorScheme.text }} />
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Continuation fragment header with "(cont.)" label — hidden during export */}
          {!isFirstFragment && (
            <div
              data-editor-only
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                padding: '4px 12px',
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${pageLayout.colorScheme.border}`,
              }}
              onMouseDown={(e) => handleDragStart(e, section.id, getFragmentId(layout))}
            >
              <span style={{
                fontFamily: sectionSubtitleStyle.fontFamily,
                fontSize: `${Math.max(7, sectionSubtitleStyle.fontSize - 1)}pt`,
                fontStyle: 'italic',
                color: sectionSubtitleStyle.color || pageLayout.colorScheme.text,
                opacity: 0.6,
              }}>
                {section.title} (cont.)
              </span>
              {hasAnyExplicitLayouts && (
                <div style={{
                  opacity: 0.3, display: 'grid', gridTemplateColumns: '4px 4px',
                  gap: '2px',
                }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: pageLayout.colorScheme.text }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={itemsContainerStyle}>
            {visibleItems.map((item: MenuItem) => renderItem(item, section.id))}
          </div>

          {/* Footnote — shown below items on the last fragment only */}
          {isLastFragment && section.footnote && (
            <div style={{
              padding: '4px 12px 6px',
              fontFamily: sectionSubtitleStyle.fontFamily,
              fontSize: `${sectionSubtitleStyle.fontSize}pt`,
              fontWeight: sectionSubtitleStyle.fontWeight,
              fontStyle: 'italic',
              letterSpacing: `${sectionSubtitleStyle.letterSpacing}px`,
              lineHeight: sectionSubtitleStyle.lineHeight,
              color: sectionSubtitleStyle.color || pageLayout.colorScheme.text,
              opacity: 0.8,
            }}>
              {section.footnote}
            </div>
          )}
        </>
      )
    },
    [
      pageLayout.typography,
      pageLayout.colorScheme,
      pageLayout.sectionTitleDecoration,
      pageLayout.sectionLayouts,
      isDragging,
      hasAnyExplicitLayouts,
      handleDragStart,
      renderItem,
      hiddenItemIds,
    ]
  )

  // Render a single section fragment (may be full section or split piece)
  // layoutKey is used as React key to distinguish split fragments of the same section
  const renderSectionFragment = useCallback(
    (section: MenuSection, layout: SectionLayout, layoutKey: string) => {
      const isSectionSelected = selectedSectionIds.includes(section.id)
      // Per-section color overrides
      const sectionColors = section.colorOverride
        ? {
            ...pageLayout.colorScheme,
            ...(section.colorOverride.accent ? { accent: section.colorOverride.accent } : {}),
            ...(section.colorOverride.background ? { background: section.colorOverride.background } : {}),
          }
        : pageLayout.colorScheme

      const decStyle = decorationStyle(pageLayout.sectionDecoration, sectionColors, pageLayout.sectionDecorations)
      const sectionBg = section.colorOverride?.background || undefined

      if (!hasAnyExplicitLayouts) {
        // Flow layout — no absolute positioning, no split fragments
        const selectionBorder = isSectionSelected ? '2px dashed #3b82f6' : undefined
        return (
          <div
            key={layoutKey}
            style={{
              marginBottom: `${pageLayout.sectionGap ?? 16}px`,
              ...(sectionBg ? { backgroundColor: sectionBg } : {}),
              ...decStyle,
              border: selectionBorder ?? decStyle.border ?? '1px solid transparent',
              breakInside: 'avoid',
            }}
            onClick={(e) => handleSectionClick(e, section.id)}
          >
            {renderSectionContent(section, layout)}
          </div>
        )
      }

      // Rectangular section positioning
      const bbox = boundingBox(layout.polygon)
      const fragStartIdx = layout.startItemIndex ?? 0
      const fragEndIdx = layout.endItemIndex ?? (section.items || []).length
      const fragTotalItems = (section.items || []).length
      const isSplitFragment = fragEndIdx < fragTotalItems || fragStartIdx > 0
      const fragId = getFragmentId(layout)
      // For explicit layouts, highlight only the specific clicked fragment
      const isFragmentSelected = selectedFragmentId === fragId
      const selectionBorder = isFragmentSelected ? '2px dashed #3b82f6' : undefined

      return (
        <div
          ref={getSectionRefCallback(fragId)}
          key={layoutKey}
          style={{
            position: 'absolute',
            left: `${bbox.x}%`,
            top: `${bbox.y}%`,
            width: `${bbox.width}%`,
            height: `${bbox.height}%`,
            zIndex: isFragmentSelected ? 10 : 1,
            backgroundColor: sectionBg || pageLayout.colorScheme.background,
            ...decStyle,
            border: selectionBorder ?? decStyle.border ?? '1px solid transparent',
          }}
          onClick={(e) => handleSectionClick(e, section.id, fragId)}
        >
          {/* Content wrapper — clips overflow to section box */}
          <div style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
            {renderSectionContent(section, layout)}
          </div>

          {/* Split indicator badge — hidden during export */}
          {isSplitFragment && (
            <div data-editor-only style={{
              position: 'absolute',
              bottom: '2px',
              right: '4px',
              fontSize: '8px',
              color: 'rgba(0,0,0,0.4)',
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: '1px 4px',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 5,
            }}>
              Items {fragStartIdx + 1}–{fragEndIdx} of {fragTotalItems}
            </div>
          )}

          {/* Resize handles — only for the specific selected fragment */}
          {selectedFragmentId === fragId && (() => {
            // Compute per-page container height for this fragment's page
            const fragPageIdx = layout.pageIndex ?? 0
            const fragIsFirst = fragPageIdx === 0
            const fragIsLast = fragPageIdx === totalLayoutPages - 1
            const fragHeight = getContainerHeight(fragIsFirst, fragIsLast) || contentHeightPx
            return (
              <PolygonEditor
                fragmentId={fragId}
                polygon={layout.polygon}
                contentWidthPx={contentWidthPx}
                contentHeightPx={fragHeight}
                zoom={zoom}
                bbox={bbox}
                columnGridLines={columnGridLines}
                onResizeEnd={() => handleResizeEnd(fragId, section.id)}
              />
            )
          })()}
        </div>
      )
    },
    [
      pageLayout.colorScheme,
      pageLayout.sectionDecoration,
      pageLayout.sectionDecorations,
      pageLayout.sectionGap,
      selectedFragmentId,
      selectedSectionIds,
      hasAnyExplicitLayouts,
      isDragging,
      handleSectionClick,
      renderSectionContent,
      handleResizeEnd,
      contentWidthPx,
      contentHeightPx,
      getContainerHeight,
      totalLayoutPages,
      columnGridLines,
      zoom,
      getSectionRefCallback,
    ]
  )

  // Build renderable fragments for a page's sections.
  // When explicit layouts exist, there may be multiple layout entries per section (splits).
  // pageIdx filters layouts to only those belonging to this page, preventing duplicates.
  const renderPageSections = useCallback(
    (sections: any[], pageIdx: number) => {
      if (!hasAnyExplicitLayouts) {
        // Flow mode: one fragment per section, default layout with dividers
        const fragments: React.ReactNode[] = []
        sections.forEach((section, idx) => {
          if (idx > 0 && pageLayout.sectionDivider !== 'none') {
            fragments.push(
              <React.Fragment key={`divider-${section.id}`}>
                {renderSectionDivider(pageLayout.sectionDivider, pageLayout.colorScheme)}
              </React.Fragment>
            )
          }
          const layout = getOrCreateSectionLayout(section.id)
          fragments.push(renderSectionFragment(section, layout, section.id))
        })
        return fragments
      }

      // Explicit layout mode: render each layout entry (including split fragments)
      // Filter by BOTH sectionId (must be on this page) AND pageIndex (must match this page)
      const layouts = pageLayout.sectionLayouts || []
      const sectionMap = new Map(sections.map((s) => [s.id, s]))

      const rendered = layouts
        .filter((layout) => (layout.pageIndex ?? 0) === pageIdx)
        .map((layout) => {
          const section = sectionMap.get(layout.sectionId)
          if (!section) return null
          // Use sectionId + startItemIndex as unique key for splits
          const key = `${layout.sectionId}-${layout.startItemIndex ?? 0}`
          return renderSectionFragment(section, layout, key)
        }).filter(Boolean)

      // Safety: on page 0, render sections that have no layout entry in flow mode.
      // This prevents sections added after auto-layout from being invisible.
      if (pageIdx === 0) {
        const layoutSectionIds = new Set(layouts.map((sl) => sl.sectionId))
        for (const section of sections) {
          if (!layoutSectionIds.has(section.id)) {
            const fallbackLayout = getOrCreateSectionLayout(section.id)
            rendered.push(renderSectionFragment(section, fallbackLayout, `fallback-${section.id}`))
          }
        }
      }

      return rendered
    },
    [hasAnyExplicitLayouts, pageLayout.sectionLayouts, pageLayout.sectionDivider, pageLayout.colorScheme, getOrCreateSectionLayout, renderSectionFragment]
  )

  // Render menu header
  // Supports 6 presets via headerConfig.preset. In 'custom' mode, title/subtitle
  // can be freely dragged (using titlePosition/subtitlePosition from menuData) and
  // logo uses its absolute x/y position. In all other presets, elements are laid
  // out according to the preset recipe and drag handlers are disabled for layout.
  const renderHeader = useCallback(() => {
    const titleStyle = pageLayout.typography.menuTitle
    const subtitleStyle = pageLayout.typography.menuSubtitle
    const headerCfg: HeaderConfig = pageLayout.headerConfig ?? createDefaultHeaderConfig()
    const preset: HeaderLayoutPreset = headerCfg.preset
    const logoScale = headerCfg.logoScale ?? 1.0

    const titleTextStyle: React.CSSProperties = {
      fontFamily: titleStyle.fontFamily,
      fontSize: `${titleStyle.fontSize}pt`,
      fontWeight: titleStyle.fontWeight,
      letterSpacing: `${titleStyle.letterSpacing}px`,
      lineHeight: titleStyle.lineHeight,
      textTransform: titleStyle.textTransform as React.CSSProperties['textTransform'],
      color: titleStyle.color || pageLayout.colorScheme.text,
    }

    const subtitleTextStyle: React.CSSProperties = {
      fontFamily: subtitleStyle.fontFamily,
      fontSize: `${subtitleStyle.fontSize}pt`,
      fontWeight: subtitleStyle.fontWeight,
      letterSpacing: `${subtitleStyle.letterSpacing}px`,
      lineHeight: subtitleStyle.lineHeight,
      textTransform: subtitleStyle.textTransform as React.CSSProperties['textTransform'],
      color: subtitleStyle.color || pageLayout.colorScheme.text,
    }

    const dividerEl = headerCfg.showDivider ? (
      <div
        style={{
          width: '60%',
          height: '2px',
          background: `linear-gradient(to right, transparent, ${pageLayout.colorScheme.accent}, transparent)`,
          margin: '8px auto 24px',
        }}
      />
    ) : (
      <div style={{ marginBottom: '24px' }} />
    )

    // Scaled logo dimensions for preset modes
    const logo = menuData.logo
    const logoW = logo ? Math.round(logo.width * logoScale) : 0
    const logoH = logo ? Math.round(logo.height * logoScale) : 0

    const logoImgEl = logo ? (
      <img
        src={logo.dataUrl}
        alt="Logo"
        style={{ width: `${logoW}px`, height: `${logoH}px`, objectFit: 'contain', display: 'block' }}
        draggable={false}
      />
    ) : null

    const titleEl = menuData.title ? (
      <h1 style={{ ...titleTextStyle, margin: 0 }}>{menuData.title}</h1>
    ) : null

    const subtitleEl = menuData.subtitle ? (
      <p style={{ ...subtitleTextStyle, margin: '4px 0 0' }}>{menuData.subtitle}</p>
    ) : null

    // Header height style
    const headerHeightStyle: React.CSSProperties = headerCfg.height > 0
      ? { height: `${headerCfg.height}px`, overflow: 'hidden' }
      : { minHeight: 'auto' }

    if (preset === 'custom') {
      // ── Custom: free-drag positioning (legacy behaviour) ──────────────────
      const titlePos = menuData.titlePosition
      const subtitlePos = menuData.subtitlePosition

      const positionedTitle = titlePos && menuData.title ? (
        <h1
          style={{
            ...titleTextStyle,
            position: 'absolute',
            left: `${titlePos.x}%`,
            top: `${titlePos.y}%`,
            width: `${titlePos.width}%`,
            transform: 'translate(-50%, 0)',
            margin: 0,
            padding: 0,
            textAlign: 'center',
            cursor: 'grab',
            zIndex: 15,
            userSelect: 'none',
          }}
          onMouseDown={handleTitleDragStart}
          draggable={false}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(139,69,19,0.3)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
        >
          {menuData.title}
        </h1>
      ) : null

      const positionedSubtitle = subtitlePos && menuData.subtitle ? (
        <p
          style={{
            ...subtitleTextStyle,
            position: 'absolute',
            left: `${subtitlePos.x}%`,
            top: `${subtitlePos.y}%`,
            width: `${subtitlePos.width}%`,
            transform: 'translate(-50%, 0)',
            margin: 0,
            padding: 0,
            textAlign: 'center',
            cursor: 'grab',
            zIndex: 15,
            userSelect: 'none',
          }}
          onMouseDown={handleSubtitleDragStart}
          draggable={false}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(139,69,19,0.3)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
        >
          {menuData.subtitle}
        </p>
      ) : null

      const staticTitle = !titlePos && menuData.title ? (
        <h1
          style={{ ...titleTextStyle, marginBottom: menuData.subtitle ? '8px' : '16px', cursor: 'grab', userSelect: 'none' }}
          onMouseDown={handleTitleDragStart}
          draggable={false}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(139,69,19,0.3)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
        >
          {menuData.title}
        </h1>
      ) : null

      const staticSubtitle = !subtitlePos && menuData.subtitle ? (
        <p
          style={{ ...subtitleTextStyle, marginBottom: '16px', cursor: 'grab', userSelect: 'none' }}
          onMouseDown={handleSubtitleDragStart}
          draggable={false}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(139,69,19,0.3)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
        >
          {menuData.subtitle}
        </p>
      ) : null

      const hasStaticContent = staticTitle !== null || staticSubtitle !== null

      // Draggable divider in custom mode
      const dividerPos = menuData.dividerPosition
      const positionedDivider = dividerPos && headerCfg.showDivider ? (
        <div
          style={{
            position: 'absolute',
            left: `${dividerPos.x}%`,
            top: `${dividerPos.y}%`,
            width: `${dividerPos.width}%`,
            transform: 'translate(-50%, 0)',
            height: '2px',
            background: `linear-gradient(to right, transparent, ${pageLayout.colorScheme.accent}, transparent)`,
            cursor: 'grab',
            zIndex: 15,
            userSelect: 'none',
          }}
          onMouseDown={handleDividerDragStart}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(139,69,19,0.3)'; (e.currentTarget as HTMLElement).style.outlineOffset = '2px' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
        />
      ) : null

      const staticDivider = !dividerPos && headerCfg.showDivider ? (
        <div
          style={{
            width: '60%',
            height: '2px',
            background: `linear-gradient(to right, transparent, ${pageLayout.colorScheme.accent}, transparent)`,
            margin: '8px auto 24px',
            cursor: 'grab',
            userSelect: 'none',
          }}
          onMouseDown={handleDividerDragStart}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(139,69,19,0.3)'; (e.currentTarget as HTMLElement).style.outlineOffset = '2px' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
        />
      ) : null

      const spacer = !headerCfg.showDivider ? <div style={{ marginBottom: '24px' }} /> : null

      return (
        <>
          {positionedTitle}
          {positionedSubtitle}
          {positionedDivider}
          {hasStaticContent && (
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              {staticTitle}
              {staticSubtitle}
              {staticDivider}
              {spacer}
            </div>
          )}
          {!hasStaticContent && <div style={{ marginBottom: '32px', textAlign: 'center' }}>{staticDivider}{spacer}</div>}
        </>
      )
    }

    // ── Preset layouts (1-5): logo rendered in-flow ───────────────────────
    if (preset === 'centered-stack') {
      return (
        <div style={{ textAlign: 'center', ...headerHeightStyle }}>
          {logoImgEl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{logoImgEl}</div>}
          {titleEl}
          {subtitleEl}
          {dividerEl}
        </div>
      )
    }

    if (preset === 'left-logo') {
      return (
        <div style={{ marginBottom: '16px', ...headerHeightStyle }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {logoImgEl && <div style={{ flex: '0 0 30%', display: 'flex', justifyContent: 'center' }}>{logoImgEl}</div>}
            <div style={{ flex: '1 1 70%' }}>
              {titleEl}
              {subtitleEl}
            </div>
          </div>
          {dividerEl}
        </div>
      )
    }

    if (preset === 'right-logo') {
      return (
        <div style={{ marginBottom: '16px', ...headerHeightStyle }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: '1 1 70%' }}>
              {titleEl}
              {subtitleEl}
            </div>
            {logoImgEl && <div style={{ flex: '0 0 30%', display: 'flex', justifyContent: 'center' }}>{logoImgEl}</div>}
          </div>
          {dividerEl}
        </div>
      )
    }

    if (preset === 'inline') {
      return (
        <div style={{ marginBottom: '16px', ...headerHeightStyle }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoImgEl}
            {titleEl && <h1 style={{ ...titleTextStyle, margin: 0, flex: '1 1 auto', textAlign: 'center' }}>{menuData.title}</h1>}
            {subtitleEl && <p style={{ ...subtitleTextStyle, margin: 0 }}>{menuData.subtitle}</p>}
          </div>
          {dividerEl}
        </div>
      )
    }

    if (preset === 'minimal') {
      return (
        <div style={{ textAlign: 'center', ...headerHeightStyle }}>
          {titleEl}
          {subtitleEl}
          {dividerEl}
        </div>
      )
    }

    // Fallback: centered-stack
    return (
      <div style={{ textAlign: 'center', ...headerHeightStyle }}>
        {logoImgEl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{logoImgEl}</div>}
        {titleEl}
        {subtitleEl}
        {dividerEl}
      </div>
    )
  }, [menuData, pageLayout.typography, pageLayout.colorScheme, pageLayout.headerConfig, handleTitleDragStart, handleSubtitleDragStart, handleDividerDragStart])

  // Render dietary legend
  const renderDietaryLegend = useCallback(() => {
    if (!pageLayout.showDietaryLegend) return null

    // Collect all dietary icons used across all sections
    const usedIcons = new Set<DietaryIcon>()
    for (const section of menuData.sections) {
      for (const item of section.items) {
        if (item.isAvailable !== false && item.dietaryIcons) {
          for (const icon of item.dietaryIcons) {
            usedIcons.add(icon)
          }
        }
      }
    }

    if (usedIcons.size === 0) return null

    const footerFont = pageLayout.typography.footer
    const sortOrder: DietaryIcon[] = ['v', 'vg', 'gf', 'df', 'nuts', 'spicy']
    const sorted = sortOrder.filter((icon) => usedIcons.has(icon))

    return (
      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontFamily: footerFont.fontFamily,
          fontSize: `${Math.max(7, footerFont.fontSize - 1)}pt`,
          color: footerFont.color || pageLayout.colorScheme.text,
        }}
      >
        {sorted.map((icon) => {
          const meta = DIETARY_ICON_META[icon]
          return (
            <span key={icon} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: meta.color,
                  color: '#fff',
                  fontSize: '7pt',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {meta.abbr}
              </span>
              <span>{meta.label}</span>
            </span>
          )
        })}
      </div>
    )
  }, [pageLayout.showDietaryLegend, pageLayout.typography.footer, pageLayout.colorScheme, menuData.sections])

  // Render footer
  const renderFooter = useCallback(() => {
    if (!menuData.footer) return null

    const footerStyle = pageLayout.typography.footer

    return (
      <div
        style={{
          marginTop: '32px',
          paddingTop: '16px',
          borderTop: `1px solid ${pageLayout.colorScheme.border}`,
          textAlign: 'center',
          fontFamily: footerStyle.fontFamily,
          fontSize: `${footerStyle.fontSize}pt`,
          fontWeight: footerStyle.fontWeight,
          letterSpacing: `${footerStyle.letterSpacing}px`,
          lineHeight: footerStyle.lineHeight,
          color: footerStyle.color || pageLayout.colorScheme.text,
        }}
      >
        {menuData.footer}
      </div>
    )
  }, [menuData.footer, pageLayout.typography.footer, pageLayout.colorScheme])

  // Page names for labels (used in multi-page mode)
  const pageNames = useMemo(() => {
    if (!pageLayout.pages) return new Map<number, string>()
    const map = new Map<number, string>()
    pageLayout.pages.forEach((p, idx) => map.set(idx, p.name))
    return map
  }, [pageLayout.pages])

  // Tri-fold fold lines
  const triFoldFoldLines = useMemo(
    () => isTriFold ? getTriFoldFoldLinesByType(
      pageLayout.triFold!.paperSize,
      pageLayout.triFold!.foldType ?? 'letter-fold',
    ) : null,
    [isTriFold, pageLayout.triFold?.paperSize, pageLayout.triFold?.foldType]
  )

  // Group sections by pageIndex for multi-page rendering.
  // When explicit PageDefinitions exist, use them for grouping.
  // Otherwise fall back to SectionLayout.pageIndex grouping.
  const pageGroups = useMemo(() => {
    const groups = new Map<number, typeof menuData.sections>()
    const allSections = (menuData.sections || []).filter(s => !hiddenSectionIds.includes(s.id))

    // Tri-fold: 2 pages — use sectionLayouts (which reflect flow across panels)
    // rather than panelSections (which only stores the initial assignment).
    if (isTriFold && pageLayout.triFold) {
      const sectionMap = new Map(allSections.map((s) => [s.id, s]))
      const seenPerPage = new Map<number, Set<string>>()

      for (const layout of pageLayout.sectionLayouts || []) {
        const pageIdx = layout.pageIndex ?? 0
        if (!groups.has(pageIdx)) {
          groups.set(pageIdx, [])
          seenPerPage.set(pageIdx, new Set())
        }
        const seen = seenPerPage.get(pageIdx)!
        if (!seen.has(layout.sectionId)) {
          seen.add(layout.sectionId)
          const section = sectionMap.get(layout.sectionId)
          if (section) groups.get(pageIdx)!.push(section)
        }
      }

      // Ensure both pages exist even if empty (tri-fold always has 2 pages)
      if (!groups.has(0)) groups.set(0, [])
      if (!groups.has(1)) groups.set(1, [])
      return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
    }

    if (pageLayout.pages && pageLayout.pages.length > 0) {
      // Use PageDefinition-based grouping
      const sectionMap = new Map(allSections.map((s) => [s.id, s]))
      pageLayout.pages.forEach((pageDef, pageIdx) => {
        const pageSections = pageDef.sectionIds
          .map((id) => sectionMap.get(id))
          .filter((s): s is typeof allSections[number] => s != null)
        groups.set(pageIdx, pageSections)
      })
    } else if (hasAnyExplicitLayouts) {
      // Build a set of sectionIds per page from layouts
      const sectionMap = new Map(allSections.map((s) => [s.id, s]))
      const seenPerPage = new Map<number, Set<string>>()

      for (const layout of pageLayout.sectionLayouts || []) {
        const pageIdx = layout.pageIndex ?? 0
        if (!groups.has(pageIdx)) {
          groups.set(pageIdx, [])
          seenPerPage.set(pageIdx, new Set())
        }
        const seen = seenPerPage.get(pageIdx)!
        if (!seen.has(layout.sectionId)) {
          seen.add(layout.sectionId)
          const section = sectionMap.get(layout.sectionId)
          if (section) groups.get(pageIdx)!.push(section)
        }
      }
    }

    // Fallback: if no explicit layouts, put everything on page 0
    if (groups.size === 0) {
      groups.set(0, allSections)
    }

    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
  }, [menuData.sections, pageLayout.sectionLayouts, pageLayout.pages, hasAnyExplicitLayouts, isTriFold, pageLayout.triFold, hiddenSectionIds])

  const totalPages = pageGroups.length > 0 ? pageGroups[pageGroups.length - 1][0] + 1 : 1

  return (
    <div data-preview-container className="w-full h-full overflow-auto bg-neutral-100">
      {/* Multi-page and overflow bar */}
      {totalPages > 1 && (
        <div className="sticky top-0 z-[100] bg-white border-b border-neutral-200 px-4 py-1.5 flex items-center gap-3 justify-center">
          <div className="flex items-center">
            <button
              onClick={() => setPreviewLayout('stacked')}
              className={`px-3 py-1 text-xs font-medium rounded-l-md border transition-colors ${
                previewLayout === 'stacked'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold'
                  : 'border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
              title="Stack pages vertically"
            >
              Stacked
            </button>
            <button
              onClick={() => {
                setPreviewLayout('side-by-side')
                const container = document.querySelector('[data-preview-container]')
                if (container) {
                  const rect = container.getBoundingClientRect()
                  const totalWidthPx = (pageWidthPx * totalPages) + (40 * (totalPages - 1))
                  const fitW = (rect.width - 80) / totalWidthPx
                  const fitH = (rect.height - 120) / pageHeightPx
                  const fit = Math.min(fitW, fitH, 2.0)
                  useUIStore.getState().setZoom(Math.max(0.25, fit))
                }
              }}
              className={`px-3 py-1 text-xs font-medium rounded-r-md border border-l-0 transition-colors ${
                previewLayout === 'side-by-side'
                  ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold'
                  : 'border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
              title="Show pages side by side"
            >
              Side by Side
            </button>
          </div>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
            {totalPages} pages
          </span>
        </div>
      )}

      {/* Overflow warning bar */}
      {overflowState && overflowState.isOverflowing && (
        <div className={`sticky ${totalPages > 1 ? 'top-[37px]' : 'top-0'} z-[99] bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 justify-center`}>
          <span className="text-xs font-semibold text-amber-800">
            Content overflows by {overflowState.overflowPercent || Math.round((overflowState.overflowAmount / overflowState.availableHeight) * 100)}%
          </span>
          <button
            onClick={handleShrinkFonts}
            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-white border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
          >
            Shrink fonts
          </button>
          <button
            onClick={handleAddColumns}
            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-white border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
          >
            Add columns
          </button>
          <button
            onClick={handleMultiPage}
            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-white border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
          >
            Multi-page
          </button>
        </div>
      )}

      {/* Pages container */}
      <div
        style={{
          display: 'flex',
          flexDirection: previewLayout === 'side-by-side' && totalPages > 1 ? 'row' : 'column',
          flexWrap: previewLayout === 'side-by-side' && totalPages > 1 ? 'wrap' : undefined,
          alignItems: previewLayout === 'side-by-side' && totalPages > 1 ? 'flex-start' : 'center',
          justifyContent: previewLayout === 'side-by-side' && totalPages > 1 ? 'center' : undefined,
          padding: '40px 20px',
          gap: '40px',
        }}
      >
        {pageGroups.map(([pageIdx, sections]) => {
          const isFirstPage = pageIdx === pageGroups[0][0]
          const isLastPage = pageIdx === pageGroups[pageGroups.length - 1][0]

          return (
            <div
              key={pageIdx}
              style={{
                width: `${scaledPageWidth}px`,
                height: `${scaledPageHeight}px`,
                position: 'relative',
                zIndex: pageIdx === selectedFragmentPageIdx ? 10 : 0,
              }}
            >
              {/* Page number badge */}
              {totalPages > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                  }}
                >
                  {isTriFold ? (pageIdx === 0 ? 'Front Side' : 'Back Side (Inside)') : (pageNames.get(pageIdx) ?? `Page ${pageIdx + 1}`)}
                </div>
              )}

              {/* Actual page */}
              <div
                id={isFirstPage ? 'page-preview' : undefined}
                className="print-page"
                data-page-index={pageIdx}
                style={{
                  width: `${pageWidthPx}px`,
                  height: `${pageHeightPx}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  backgroundColor: pageLayout.colorScheme.background,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  position: 'relative',
                  overflow: hasAnyExplicitLayouts && selectedSectionId ? 'visible' : 'hidden',
                  ...backgroundTextureStyle(pageLayout.backgroundTexture || 'none'),
                  ...pageBorderStyle(pageLayout.pageBorder || 'none', pageLayout.colorScheme),
                }}
                onClick={handlePageClick}
              >
                {/* Content area with margins */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${pageLayout.margins.top * DPI}px`,
                    right: `${pageLayout.margins.right * DPI}px`,
                    bottom: `${pageLayout.margins.bottom * DPI}px`,
                    left: `${pageLayout.margins.left * DPI}px`,
                    color: pageLayout.colorScheme.text,
                  }}
                >
                  {/* Header on first page only (suppressed in tri-fold mode) */}
                  {isFirstPage && !isTriFold && renderHeader()}

                  {/* Logo — absolutely positioned within content area (custom preset only, suppressed in tri-fold) */}
                  {isFirstPage && !isTriFold && menuData.logo && (pageLayout.headerConfig?.preset ?? 'centered-stack') === 'custom' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${menuData.logo.x}%`,
                        top: `${menuData.logo.y}%`,
                        transform: 'translate(-50%, 0)',
                        width: `${menuData.logo.width}px`,
                        height: `${menuData.logo.height}px`,
                        zIndex: 20,
                      }}
                    >
                      <img
                        src={menuData.logo.dataUrl}
                        alt="Logo"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          cursor: 'grab',
                          outline: logoSelected ? '2px dashed #3b82f6' : 'none',
                          outlineOffset: '2px',
                        }}
                        onMouseDown={handleLogoDragStart}
                        onClick={(e) => {
                          e.stopPropagation()
                          setLogoSelected(true)
                          selectSection(null)
                        }}
                        draggable={false}
                      />
                      {/* Corner resize handles */}
                      {logoSelected && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                        const isLeft = corner.includes('w')
                        const isTop = corner.includes('n')
                        return (
                          <div
                            key={corner}
                            style={{
                              position: 'absolute',
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#3b82f6',
                              border: '1px solid white',
                              borderRadius: '50%',
                              cursor: `${corner}-resize`,
                              ...(isLeft ? { left: '-4px' } : { right: '-4px' }),
                              ...(isTop ? { top: '-4px' } : { bottom: '-4px' }),
                              zIndex: 30,
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const logo = menuData.logo!
                              const startX = e.clientX
                              const startY = e.clientY
                              const startW = logo.width
                              const startH = logo.height
                              const startLogoX = logo.x
                              const startLogoY = logo.y
                              const aspectRatio = startH / startW

                              const onMove = (moveE: MouseEvent) => {
                                const dxPx = (moveE.clientX - startX) / zoom
                                const dyPx = (moveE.clientY - startY) / zoom
                                let newW = startW
                                let newH = startH

                                if (isLeft) {
                                  newW = Math.max(20, startW - dxPx)
                                } else {
                                  newW = Math.max(20, startW + dxPx)
                                }

                                if (moveE.shiftKey) {
                                  newH = newW * aspectRatio
                                } else {
                                  if (isTop) {
                                    newH = Math.max(20, startH - dyPx)
                                  } else {
                                    newH = Math.max(20, startH + dyPx)
                                  }
                                }

                                // Adjust position for top/left corners to keep opposite corner anchored
                                let newLogoX = startLogoX
                                let newLogoY = startLogoY
                                if (isLeft) {
                                  const wDelta = newW - startW
                                  newLogoX = startLogoX - (wDelta / contentWidthPx) * 50
                                }
                                if (isTop) {
                                  const hDelta = newH - startH
                                  newLogoY = startLogoY - (hDelta / contentHeightPx) * 100
                                }

                                setLogo({
                                  ...logo,
                                  width: Math.round(newW),
                                  height: Math.round(newH),
                                  x: Math.max(0, Math.min(100, newLogoX)),
                                  y: Math.max(0, Math.min(100, newLogoY)),
                                })
                                markDirty()
                              }

                              const onUp = () => {
                                document.removeEventListener('mousemove', onMove)
                                document.removeEventListener('mouseup', onUp)
                              }
                              document.addEventListener('mousemove', onMove)
                              document.addEventListener('mouseup', onUp)
                            }}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Behind-layer elements (z-index 0, behind sections) */}
                  {(menuData.pageImages || [])
                    .filter((img) => img.pageIndex === pageIdx && img.layer === 'behind')
                    .map((img) => (
                      <div key={img.id} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
                          <DraggableImage
                            image={img}
                            isSelected={selectedPageImageId === img.id}
                            contentWidthPx={contentWidthPx}
                            contentHeightPx={contentHeightPx}
                            zoom={zoom}
                            onSelect={handlePageImageSelect}
                            onUpdate={handlePageImageUpdate}
                          />
                        </div>
                      </div>
                    ))}
                  {(menuData.textFrames || [])
                    .filter((tf) => tf.pageIndex === pageIdx && tf.layer === 'behind')
                    .map((tf) => (
                      <div key={tf.id} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
                          <DraggableTextFrame
                            frame={tf}
                            isSelected={selectedTextFrameId === tf.id}
                            contentWidthPx={contentWidthPx}
                            contentHeightPx={contentHeightPx}
                            zoom={zoom}
                            onSelect={handleTextFrameSelect}
                            onUpdate={handleTextFrameUpdate}
                            onUpdateContent={handleTextFrameContentUpdate}
                          />
                        </div>
                      </div>
                    ))}

                  {/* Sections container */}
                  <div
                    ref={isFirstPage ? sectionsRef : undefined}
                    style={{
                      position: 'relative',
                      minHeight: hasAnyExplicitLayouts ? undefined : '200px',
                      height: (() => {
                        const h = getContainerHeight(isFirstPage, isLastPage)
                        return h != null ? `${h}px` : undefined
                      })(),
                    }}
                  >
                    {/* Snap guide lines — visible during drag */}
                    {isDragging && hasAnyExplicitLayouts && columnGridLines.map((pct, i) => (
                      <div
                        key={`snap-${i}`}
                        style={{
                          position: 'absolute',
                          left: `${pct}%`,
                          top: 0,
                          bottom: 0,
                          width: '1px',
                          backgroundColor: '#3b82f680',
                          pointerEvents: 'none',
                          zIndex: 999,
                        }}
                      />
                    ))}
                    {renderPageSections(sections, pageIdx)}
                  </div>

                  {/* Front-layer elements (z-index 12, in front of sections) */}
                  {(menuData.pageImages || [])
                    .filter((img) => img.pageIndex === pageIdx && img.layer === 'front')
                    .map((img) => (
                      <div key={img.id} style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
                          <DraggableImage
                            image={img}
                            isSelected={selectedPageImageId === img.id}
                            contentWidthPx={contentWidthPx}
                            contentHeightPx={contentHeightPx}
                            zoom={zoom}
                            onSelect={handlePageImageSelect}
                            onUpdate={handlePageImageUpdate}
                          />
                        </div>
                      </div>
                    ))}
                  {(menuData.textFrames || [])
                    .filter((tf) => tf.pageIndex === pageIdx && tf.layer === 'front')
                    .map((tf) => (
                      <div key={tf.id} style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
                          <DraggableTextFrame
                            frame={tf}
                            isSelected={selectedTextFrameId === tf.id}
                            contentWidthPx={contentWidthPx}
                            contentHeightPx={contentHeightPx}
                            zoom={zoom}
                            onSelect={handleTextFrameSelect}
                            onUpdate={handleTextFrameUpdate}
                            onUpdateContent={handleTextFrameContentUpdate}
                          />
                        </div>
                      </div>
                    ))}

                  {/* Dietary legend + Footer on last page only (suppressed in tri-fold) */}
                  {isLastPage && !isTriFold && renderDietaryLegend()}
                  {isLastPage && !isTriFold && renderFooter()}
                </div>

                {/* Tri-fold fold lines, panel labels, and special panel content */}
                {isTriFold && triFoldFoldLines && (
                  <>
                    {/* Fold line 1 */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${triFoldFoldLines[0]}%`,
                        top: 0,
                        bottom: 0,
                        width: 0,
                        borderLeft: getTriFoldLineStyle(pageLayout.triFold?.foldType ?? 'letter-fold', 0),
                        pointerEvents: 'none',
                        zIndex: 50,
                      }}
                    />
                    {/* Fold line 2 */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${triFoldFoldLines[1]}%`,
                        top: 0,
                        bottom: 0,
                        width: 0,
                        borderLeft: getTriFoldLineStyle(pageLayout.triFold?.foldType ?? 'letter-fold', 1),
                        pointerEvents: 'none',
                        zIndex: 50,
                      }}
                    />
                    {/* Panel labels and special content */}
                    {(pageIdx === 0 ? TRI_FOLD_FRONT_PANELS : TRI_FOLD_BACK_PANELS).map((panel, i) => {
                      const leftPct = i === 0 ? 0 : i === 1 ? triFoldFoldLines[0] : triFoldFoldLines[1]
                      const rightPct = i === 0 ? triFoldFoldLines[0] : i === 1 ? triFoldFoldLines[1] : 100
                      const panelWidthPct = rightPct - leftPct

                      // Cover panel: show title/subtitle/logo overlay
                      const isCoverPanel = panel === 'cover'
                      const isBackPanel = panel === 'back'
                      const triFoldCfg = pageLayout.triFold!
                      const titleTypo = pageLayout.typography.menuTitle
                      const subtitleTypo = pageLayout.typography.menuSubtitle
                      const footerTypo = pageLayout.typography.footer

                      return (
                        <React.Fragment key={panel}>
                          {/* Panel label */}
                          <div
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              width: `${panelWidthPct}%`,
                              top: '4px',
                              textAlign: 'center',
                              fontSize: '9px',
                              fontWeight: 600,
                              color: 'rgba(0,0,0,0.25)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              pointerEvents: 'none',
                              zIndex: 50,
                            }}
                          >
                            {TRI_FOLD_PANEL_LABELS[panel]}
                          </div>

                          {/* Cover panel: title, subtitle, logo */}
                          {isCoverPanel && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                width: `${panelWidthPct}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                textAlign: 'center',
                                padding: '0 8px',
                                pointerEvents: 'none',
                                zIndex: 40,
                              }}
                            >
                              {(triFoldCfg.coverShowLogo !== false) && menuData.logo && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                  <img
                                    src={menuData.logo.dataUrl}
                                    alt="Logo"
                                    style={{ width: '80px', objectFit: 'contain' }}
                                    draggable={false}
                                  />
                                </div>
                              )}
                              {(triFoldCfg.coverShowTitle !== false) && menuData.title && (
                                <div style={{
                                  fontFamily: titleTypo.fontFamily,
                                  fontSize: `${Math.max(10, titleTypo.fontSize * 0.65)}pt`,
                                  fontWeight: titleTypo.fontWeight,
                                  color: titleTypo.color || pageLayout.colorScheme.text,
                                  marginBottom: '4px',
                                }}>
                                  {menuData.title}
                                </div>
                              )}
                              {(triFoldCfg.coverShowSubtitle !== false) && menuData.subtitle && (
                                <div style={{
                                  fontFamily: subtitleTypo.fontFamily,
                                  fontSize: `${Math.max(7, subtitleTypo.fontSize * 0.65)}pt`,
                                  fontWeight: subtitleTypo.fontWeight,
                                  color: subtitleTypo.color || pageLayout.colorScheme.text,
                                }}>
                                  {menuData.subtitle}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Back panel: footer text + custom text */}
                          {isBackPanel && (triFoldCfg.backShowFooter !== false || triFoldCfg.backCustomText) && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                width: `${panelWidthPct}%`,
                                bottom: '24px',
                                textAlign: 'center',
                                padding: '0 8px',
                                pointerEvents: 'none',
                                zIndex: 40,
                              }}
                            >
                              {triFoldCfg.backCustomText && (
                                <div style={{
                                  fontFamily: footerTypo.fontFamily,
                                  fontSize: `${Math.max(7, footerTypo.fontSize)}pt`,
                                  color: footerTypo.color || pageLayout.colorScheme.text,
                                  marginBottom: '8px',
                                  whiteSpace: 'pre-wrap',
                                }}>
                                  {triFoldCfg.backCustomText}
                                </div>
                              )}
                              {(triFoldCfg.backShowFooter !== false) && menuData.footer && (
                                <div style={{
                                  fontFamily: footerTypo.fontFamily,
                                  fontSize: `${Math.max(7, footerTypo.fontSize)}pt`,
                                  color: footerTypo.color || pageLayout.colorScheme.text,
                                }}>
                                  {menuData.footer}
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </>
                )}

                {/* Overflow boundary indicator */}
                {isLastPage && overflowState?.isOverflowing && totalPages <= 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: `${pageLayout.margins.bottom * DPI}px`,
                      left: '0',
                      right: '0',
                      borderBottom: '2px dashed #ef4444',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

