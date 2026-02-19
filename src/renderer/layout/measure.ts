import type { FontStyle, TypographyConfig, ItemSeparator, ColumnCount, VariantDisplayMode } from '../models/layout'
import type { MenuData, MenuSection, PriceVariant } from '../models/menu'

const PT_TO_PX = 96 / 72

let _canvas: HTMLCanvasElement | null = null
function getCanvas(): CanvasRenderingContext2D {
  if (!_canvas) {
    _canvas = document.createElement('canvas')
  }
  return _canvas.getContext('2d')!
}

/** Convert font pt size + lineHeight multiplier to pixel line height */
export function textLineHeight(style: FontStyle): number {
  return style.fontSize * PT_TO_PX * style.lineHeight
}

/** Measure the pixel width of a string using Canvas API */
export function measureTextWidth(text: string, style: FontStyle): number {
  const ctx = getCanvas()
  const weight = style.fontWeight
  const sizePx = style.fontSize * PT_TO_PX
  ctx.font = `${weight} ${sizePx}px ${style.fontFamily}`
  return ctx.measureText(text).width
}

/** Estimate how many lines a text string wraps to at a given container width */
export function estimateLineCount(text: string, style: FontStyle, containerWidthPx: number): number {
  if (!text || containerWidthPx <= 0) return 0
  const textWidth = measureTextWidth(text, style)
  return Math.max(1, Math.ceil(textWidth / containerWidthPx))
}

/** Separator height: 17px (8px margin top + 1px + 8px margin bottom) when present */
const SEPARATOR_HEIGHT = 17

export interface SectionHeightResult {
  sectionId: string
  estimatedHeight: number
  itemCount: number
}

/**
 * Estimate the rendered height of a menu section in pixels.
 * Mirrors the exact padding/margin values from PagePreview.tsx.
 */
export function estimateSectionHeight(
  section: MenuSection,
  typography: TypographyConfig,
  containerWidthPx: number,
  columnCount: ColumnCount,
  itemSeparator: ItemSeparator,
  variantDisplayMode?: VariantDisplayMode,
): SectionHeightResult {
  // Section header: 8px padding-top + 12px padding-left/right (but height is vertical only)
  // padding: '8px 12px' → 8px top + 8px bottom = 16px vertical padding
  let headerHeight = 16 // padding top + bottom

  if (section.title) {
    headerHeight += textLineHeight(typography.sectionTitle)
    if (section.subtitle || section.footnote) {
      headerHeight += 4 // marginBottom on title when subtitle/footnote exists
    }
  }
  if (section.subtitle) {
    headerHeight += textLineHeight(typography.sectionSubtitle)
  }
  if (section.footnote) {
    headerHeight += textLineHeight(typography.sectionSubtitle)
  }
  headerHeight += 1 // borderBottom

  // Items container: padding '16px' → 16px top + 16px bottom = 32px
  const itemsPadding = 32
  const gap = columnCount <= 2 ? 24 : 16
  const itemContainerWidth = columnCount > 1
    ? (containerWidthPx - 32 - (columnCount - 1) * gap) / columnCount
    : containerWidthPx - 32 // 16px padding each side

  let totalItemsHeight = 0
  const items = section.items || []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    let itemHeight = 0

    // Name line (single line typically, but could wrap)
    const nameLines = estimateLineCount(item.name, typography.itemName, itemContainerWidth * 0.7)
    itemHeight += nameLines * textLineHeight(typography.itemName)

    // Description
    if (item.description) {
      itemHeight += 4 // marginTop on description
      const descLines = estimateLineCount(item.description, typography.itemDescription, itemContainerWidth)
      itemHeight += descLines * textLineHeight(typography.itemDescription)
    }

    // Stacked variants
    if (item.variants?.length && variantDisplayMode === 'stacked') {
      itemHeight += 2 // marginTop
      itemHeight += item.variants.filter((v: PriceVariant) => v.price).length * textLineHeight(typography.itemPrice)
    }

    // Tags row
    if (item.tags && item.tags.length > 0) {
      itemHeight += 4 + 20 // marginTop + approximate tag height
    }

    // Bottom margin
    itemHeight += 12 // marginBottom on item container

    // Separator
    if (itemSeparator !== 'none') {
      itemHeight += SEPARATOR_HEIGHT
    }

    totalItemsHeight += itemHeight
  }

  // For multi-column layout, items split across columns
  let itemsAreaHeight: number
  if (columnCount > 1 && items.length > 0) {
    itemsAreaHeight = Math.ceil(totalItemsHeight / columnCount)
  } else {
    itemsAreaHeight = totalItemsHeight
  }

  const totalHeight = headerHeight + itemsPadding + itemsAreaHeight

  return {
    sectionId: section.id,
    estimatedHeight: totalHeight,
    itemCount: items.length,
  }
}

/** Estimate a single item's rendered height */
function measureSingleItemHeight(
  item: { name: string; description?: string; tags?: string[]; variants?: PriceVariant[] },
  typography: TypographyConfig,
  itemContainerWidth: number,
  itemSeparator: ItemSeparator,
  variantDisplayMode?: VariantDisplayMode,
): number {
  let h = 0
  const nameLines = estimateLineCount(item.name, typography.itemName, itemContainerWidth * 0.7)
  h += nameLines * textLineHeight(typography.itemName)
  if (item.variants?.length && variantDisplayMode === 'stacked') {
    h += 2 // marginTop
    h += item.variants.filter((v) => v.price).length * textLineHeight(typography.itemPrice)
  }
  if (item.description) {
    h += 4
    const descLines = estimateLineCount(item.description, typography.itemDescription, itemContainerWidth)
    h += descLines * textLineHeight(typography.itemDescription)
  }
  if (item.tags && item.tags.length > 0) {
    h += 4 + 20
  }
  h += 12 // marginBottom
  if (itemSeparator !== 'none') {
    h += SEPARATOR_HEIGHT
  }
  return h
}

/** Measure section header height (title + subtitle + footnote as subtitle) */
function measureSectionHeaderHeight(
  section: MenuSection,
  typography: TypographyConfig,
): number {
  let h = 16 // padding top + bottom
  if (section.title) {
    h += textLineHeight(typography.sectionTitle)
    if (section.subtitle || section.footnote) h += 4
  }
  if (section.subtitle) {
    h += textLineHeight(typography.sectionSubtitle)
  }
  if (section.footnote) {
    h += textLineHeight(typography.sectionSubtitle)
  }
  h += 1 // borderBottom
  return h
}

/**
 * Find how many items from startIndex fit within availableHeightPx.
 * Returns the split point (exclusive end index) and used height.
 * If all items fit, splitIndex === items.length.
 */
export function findSplitPoint(
  section: MenuSection,
  typography: TypographyConfig,
  containerWidthPx: number,
  availableHeightPx: number,
  itemSeparator: ItemSeparator,
  startItemIndex: number = 0,
  variantDisplayMode?: VariantDisplayMode,
): { splitIndex: number; usedHeight: number } {
  const items = section.items || []
  const itemContainerWidth = containerWidthPx - 32

  let usedHeight = 0

  // Header only for the first fragment
  if (startItemIndex === 0) {
    usedHeight += measureSectionHeaderHeight(section, typography)
  }

  // Items container top padding
  usedHeight += 16

  for (let i = startItemIndex; i < items.length; i++) {
    const itemH = measureSingleItemHeight(items[i], typography, itemContainerWidth, itemSeparator, variantDisplayMode)

    // Check if adding this item would exceed available height
    // (always include at least 1 item to avoid infinite loops)
    if (usedHeight + itemH + 16 > availableHeightPx && i > startItemIndex) {
      return { splitIndex: i, usedHeight: usedHeight + 16 } // +16 for bottom padding
    }
    usedHeight += itemH
  }

  // Everything fits — add bottom padding
  usedHeight += 16 // bottom padding

  return { splitIndex: items.length, usedHeight }
}

/**
 * Estimate the height of a partial section (for split continuations).
 * Includes header only if startItemIndex === 0.
 */
export function estimatePartialSectionHeight(
  section: MenuSection,
  typography: TypographyConfig,
  containerWidthPx: number,
  itemSeparator: ItemSeparator,
  startItemIndex: number,
  endItemIndex?: number,
  variantDisplayMode?: VariantDisplayMode,
): number {
  const items = section.items || []
  const end = endItemIndex ?? items.length
  const itemContainerWidth = containerWidthPx - 32

  let height = 0

  // Header only for first fragment
  if (startItemIndex === 0) {
    height += measureSectionHeaderHeight(section, typography)
  }

  // Items container padding (top + bottom)
  height += 32

  for (let i = startItemIndex; i < end; i++) {
    height += measureSingleItemHeight(items[i], typography, itemContainerWidth, itemSeparator, variantDisplayMode)
  }

  return height
}

/**
 * Estimate the height of the menu header area (title + subtitle + divider + margins).
 * Matches PagePreview.tsx renderHeader().
 */
export function estimateHeaderHeight(menuData: MenuData, typography: TypographyConfig): number {
  if (!menuData.title && !menuData.subtitle && !menuData.logo) return 0

  let height = 0

  // Logo
  if (menuData.logo) {
    height += menuData.logo.height + 16 // marginBottom
  }

  // Title
  if (menuData.title) {
    height += textLineHeight(typography.menuTitle)
    height += menuData.subtitle ? 8 : 16 // marginBottom
  }

  // Subtitle
  if (menuData.subtitle) {
    height += textLineHeight(typography.menuSubtitle)
    height += 16 // marginBottom
  }

  // Decorative divider: 2px height
  height += 2

  // Container marginBottom: 32px
  height += 32

  return height
}

/**
 * Estimate footer height. Matches PagePreview.tsx renderFooter().
 */
export function estimateFooterHeight(footer: string, typography: TypographyConfig): number {
  if (!footer) return 0

  // marginTop: 32px + paddingTop: 16px + borderTop: 1px + text
  return 32 + 16 + 1 + textLineHeight(typography.footer)
}
