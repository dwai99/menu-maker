export type PageSizeId = 'letter' | 'legal' | 'half-letter' | 'a4' | 'a5' | 'table-tent' | 'tri-fold'
export type Orientation = 'portrait' | 'landscape'
export type HeaderLayoutPreset = 'centered-stack' | 'left-logo' | 'right-logo' | 'inline' | 'minimal' | 'custom'

export interface HeaderConfig {
  preset: HeaderLayoutPreset
  height: number           // px, 0 = auto
  showDivider: boolean     // gradient divider line below header
  logoScale: number        // 0.5 - 2.0 multiplier for logo display size
}

export function createDefaultHeaderConfig(): HeaderConfig {
  return { preset: 'centered-stack', height: 0, showDivider: true, logoScale: 1.0 }
}

export type ItemSeparator = 'none' | 'line' | 'dots' | 'dashes'
export type PriceFormat = 'right-aligned' | 'inline' | 'dot-leaders'
export type LayoutDirection = 'vertical' | 'horizontal'
export type SectionDecoration = 'none' | 'border' | 'shadow' | 'filled' | 'accent-left'
export type Currency = '$' | '€' | '£' | '¥' | 'none'
export type BackgroundTexture = 'none' | 'paper' | 'linen' | 'parchment' | 'chalkboard' | 'marble'
export type SectionDivider = 'none' | 'line' | 'dots' | 'flourish' | 'diamond' | 'double-line'
export type PageBorder = 'none' | 'thin' | 'double' | 'thick' | 'inset'
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize'
export type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6
export type VariantDisplayMode = 'inline' | 'stacked'
export type PricePosition = 'inline' | 'below'
export type Vertex = [number, number]  // [x%, y%] relative to content area

export interface PageDimensions {
  width: number   // in inches
  height: number  // in inches
  label: string
}

export const PAGE_SIZES: Record<PageSizeId, PageDimensions> = {
  'letter': { width: 8.5, height: 11, label: 'Letter (8.5" × 11")' },
  'legal': { width: 8.5, height: 14, label: 'Legal (8.5" × 14")' },
  'half-letter': { width: 5.5, height: 8.5, label: 'Half Letter (5.5" × 8.5")' },
  'a4': { width: 8.27, height: 11.69, label: 'A4 (210 × 297mm)' },
  'a5': { width: 5.83, height: 8.27, label: 'A5 (148 × 210mm)' },
  'table-tent': { width: 4, height: 6, label: 'Table Tent (4" × 6")' },
  'tri-fold': { width: 3.67, height: 8.5, label: 'Tri-fold Panel (3.67" × 8.5")' },
}

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface FontStyle {
  fontFamily: string
  fontSize: number        // in pt
  fontWeight: number
  letterSpacing: number   // in px
  lineHeight: number
  textTransform: TextTransform
  textAlign: 'left' | 'center' | 'right'
  color: string
}

export interface TypographyConfig {
  menuTitle: FontStyle
  menuSubtitle: FontStyle
  sectionTitle: FontStyle
  sectionSubtitle: FontStyle
  itemName: FontStyle
  itemDescription: FontStyle
  itemPrice: FontStyle
  footer: FontStyle
}

export interface ColorScheme {
  background: string
  text: string
  accent: string
  border: string
  sectionTitle?: string   // falls back to accent
  price?: string          // falls back to accent
}

export interface SectionLayout {
  sectionId: string
  polygon: Vertex[]       // clockwise vertices [x%, y%] relative to content area (min 3)
  columnCount: ColumnCount // per-section override (legacy, used by treemap)
  pageIndex: number       // which page this section belongs to (0-based)
  startItemIndex?: number // first item to render (default: 0) — for section splitting
  endItemIndex?: number   // last item index exclusive (default: all) — for section splitting
}

export type VariantSeparator = '/' | '·' | '|' | '—'
export type SectionTitleDecoration = 'none' | 'underline-solid' | 'underline-double' | 'ornamental-flourish' | 'ornamental-lines' | 'ornamental-diamond'

export interface PageLayout {
  pageSize: PageSizeId
  orientation: Orientation
  margins: Margins
  columnCount: ColumnCount
  layoutDirection: LayoutDirection
  sectionLayouts: SectionLayout[]
  colorScheme: ColorScheme
  typography: TypographyConfig
  itemSeparator: ItemSeparator
  priceFormat: PriceFormat
  sectionDecoration: SectionDecoration
  sectionDecorations?: SectionDecoration[]
  currency: Currency
  backgroundTexture: BackgroundTexture
  sectionDivider: SectionDivider
  pageBorder: PageBorder
  sectionGap: number
  headerHeight?: number  // px — space reserved for header elements before sections
  pricePosition?: PricePosition
  variantDisplayMode?: VariantDisplayMode
  variantSeparator?: VariantSeparator
  sectionTitleDecoration?: SectionTitleDecoration
  pages?: PageDefinition[]
  triFold?: TriFoldConfig
  printMarks?: PrintMarks
  showDietaryLegend?: boolean
  headerConfig?: HeaderConfig
}

export function createDefaultFontStyle(overrides?: Partial<FontStyle>): FontStyle {
  return {
    fontFamily: 'system-ui',
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.5,
    textTransform: 'none',
    textAlign: 'left',
    color: '#2C1810',
    ...overrides,
  }
}

export function createDefaultTypography(): TypographyConfig {
  return {
    menuTitle: createDefaultFontStyle({
      fontFamily: 'Georgia',
      fontSize: 28,
      fontWeight: 700,
      textAlign: 'center',
    }),
    menuSubtitle: createDefaultFontStyle({
      fontFamily: 'Georgia',
      fontSize: 14,
      textAlign: 'center',
    }),
    sectionTitle: createDefaultFontStyle({
      fontFamily: 'Georgia',
      fontSize: 18,
      fontWeight: 700,
      color: '',
    }),
    sectionSubtitle: createDefaultFontStyle({
      fontSize: 12,
      fontWeight: 400,
      textTransform: 'none',
    }),
    itemName: createDefaultFontStyle({
      fontSize: 12,
      fontWeight: 700,
    }),
    itemDescription: createDefaultFontStyle({
      fontSize: 10,
    }),
    itemPrice: createDefaultFontStyle({
      fontSize: 12,
      fontWeight: 700,
      textAlign: 'right',
      color: '',
    }),
    footer: createDefaultFontStyle({
      fontSize: 9,
      textAlign: 'center',
    }),
  }
}

export function createDefaultColorScheme(): ColorScheme {
  return {
    background: '#FFFFFF',
    text: '#000000',
    accent: '#000000',
    border: '#000000',
  }
}

export interface PageDefinition {
  id: string
  name: string
  columnCount: ColumnCount
  sectionIds: string[]
}

// ── Tri-Fold Layout ──────────────────────────────────────────
export type TriFoldPanelRole = 'cover' | 'back' | 'inner-flap' | 'inside-left' | 'inside-center' | 'inside-right'

export const TRI_FOLD_PANEL_LABELS: Record<TriFoldPanelRole, string> = {
  'cover': 'Cover',
  'back': 'Back',
  'inner-flap': 'Inner Flap',
  'inside-left': 'Inside Left',
  'inside-center': 'Inside Center',
  'inside-right': 'Inside Right',
}

/**
 * Front side (page 0) panels left→right: inner-flap | back | cover
 * Back side  (page 1) panels left→right: inside-left | inside-center | inside-right
 */
export const TRI_FOLD_FRONT_PANELS: TriFoldPanelRole[] = ['inner-flap', 'back', 'cover']
export const TRI_FOLD_BACK_PANELS: TriFoldPanelRole[] = ['inside-left', 'inside-center', 'inside-right']

export type TriFoldPaperSize = 'letter' | 'legal'
export type TriFoldType = 'letter-fold' | 'z-fold' | 'gate-fold'

export interface TriFoldConfig {
  enabled: boolean
  paperSize: TriFoldPaperSize
  foldType: TriFoldType
  /** Which sections go on which panel */
  panelSections: Partial<Record<TriFoldPanelRole, string[]>>
  // Cover panel special content
  coverShowTitle: boolean
  coverShowSubtitle: boolean
  coverShowLogo: boolean
  // Back panel content
  backShowFooter: boolean
  backCustomText?: string
}

// ── Print Marks ──────────────────────────────────────────────
export interface PrintMarks {
  bleed: number              // inches (default 0.125)
  showCropMarks: boolean
  showRegistrationMarks: boolean
}

export function createDefaultPageLayout(): PageLayout {
  return {
    pageSize: 'letter',
    orientation: 'portrait',
    margins: {
      top: 0.25,
      right: 0.25,
      bottom: 0.25,
      left: 0.25,
    },
    columnCount: 1,
    layoutDirection: 'vertical',
    sectionLayouts: [],
    colorScheme: createDefaultColorScheme(),
    typography: createDefaultTypography(),
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
    sectionDecoration: 'none',
    currency: '$',
    backgroundTexture: 'none',
    sectionDivider: 'none',
    pageBorder: 'none',
    sectionGap: 16,
  }
}
