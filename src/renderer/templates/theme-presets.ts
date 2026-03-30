import type { ColorScheme, TypographyConfig, ItemSeparator, SectionDecoration, SectionDivider, SectionTitleDecoration, BackgroundTexture, PageBorder, PriceFormat } from '@/models/layout'
import { stylePresets } from './style-presets'

export interface ThemeDecorations {
  itemSeparator: ItemSeparator
  sectionDecoration: SectionDecoration
  sectionDecorations?: SectionDecoration[]
  sectionDivider: SectionDivider
  sectionTitleDecoration: SectionTitleDecoration
  backgroundTexture: BackgroundTexture
  pageBorder: PageBorder
  priceFormat: PriceFormat
}

export interface ThemePreset {
  id: string
  name: string
  description: string
  stylePresetId: string
  decorations: ThemeDecorations
}

export interface ResolvedTheme {
  colorScheme: ColorScheme
  typography: TypographyConfig
  decorations: ThemeDecorations
}

export function resolveThemePreset(theme: ThemePreset): ResolvedTheme {
  const style = stylePresets.find((p) => p.id === theme.stylePresetId)
  if (!style) {
    const fallback = stylePresets[0]
    return { colorScheme: fallback.colorScheme, typography: fallback.typography, decorations: theme.decorations }
  }
  return { colorScheme: style.colorScheme, typography: style.typography, decorations: theme.decorations }
}

export const themePresets: ThemePreset[] = [
  {
    id: 'black-white',
    name: 'Black & White',
    description: 'No color ink — clean and professional',
    stylePresetId: 'black-white',
    decorations: {
      itemSeparator: 'none',
      sectionDecoration: 'none',
      sectionDecorations: [],
      sectionDivider: 'line',
      sectionTitleDecoration: 'underline-solid',
      backgroundTexture: 'none',
      pageBorder: 'none',
      priceFormat: 'right-aligned',
    },
  },
  {
    id: 'classic-formal',
    name: 'Classic Formal',
    description: 'Elegant borders with double-line dividers',
    stylePresetId: 'classic-elegance',
    decorations: {
      itemSeparator: 'none',
      sectionDecoration: 'border',
      sectionDecorations: ['border'],
      sectionDivider: 'double-line',
      sectionTitleDecoration: 'underline-double',
      backgroundTexture: 'none',
      pageBorder: 'double',
      priceFormat: 'dot-leaders',
    },
  },
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Minimal with no decorations',
    stylePresetId: 'modern-minimal',
    decorations: {
      itemSeparator: 'none',
      sectionDecoration: 'none',
      sectionDecorations: [],
      sectionDivider: 'none',
      sectionTitleDecoration: 'none',
      backgroundTexture: 'none',
      pageBorder: 'none',
      priceFormat: 'right-aligned',
    },
  },
  {
    id: 'dark-lounge',
    name: 'Dark Lounge',
    description: 'Dramatic dark with gold flourishes',
    stylePresetId: 'dark-luxe',
    decorations: {
      itemSeparator: 'none',
      sectionDecoration: 'accent-left',
      sectionDecorations: ['accent-left'],
      sectionDivider: 'flourish',
      sectionTitleDecoration: 'ornamental-flourish',
      backgroundTexture: 'none',
      pageBorder: 'thin',
      priceFormat: 'right-aligned',
    },
  },
  {
    id: 'rustic-bistro',
    name: 'Rustic Bistro',
    description: 'Warm paper with filled sections',
    stylePresetId: 'rustic-charm',
    decorations: {
      itemSeparator: 'none',
      sectionDecoration: 'filled',
      sectionDecorations: ['filled'],
      sectionDivider: 'line',
      sectionTitleDecoration: 'underline-solid',
      backgroundTexture: 'paper',
      pageBorder: 'none',
      priceFormat: 'right-aligned',
    },
  },
  {
    id: 'fresh-market',
    name: 'Fresh Market',
    description: 'Light green with line dividers',
    stylePresetId: 'fresh-garden',
    decorations: {
      itemSeparator: 'line',
      sectionDecoration: 'none',
      sectionDecorations: [],
      sectionDivider: 'line',
      sectionTitleDecoration: 'underline-solid',
      backgroundTexture: 'none',
      pageBorder: 'thin',
      priceFormat: 'right-aligned',
    },
  },
  {
    id: 'coastal-casual',
    name: 'Coastal Casual',
    description: 'Ocean blue with dot dividers',
    stylePresetId: 'coastal-blue',
    decorations: {
      itemSeparator: 'dots',
      sectionDecoration: 'none',
      sectionDecorations: [],
      sectionDivider: 'dots',
      sectionTitleDecoration: 'ornamental-lines',
      backgroundTexture: 'none',
      pageBorder: 'none',
      priceFormat: 'inline',
    },
  },
  {
    id: 'chalkboard-pub',
    name: 'Chalkboard Pub',
    description: 'Dark chalkboard with dashed items',
    stylePresetId: 'dark-luxe',
    decorations: {
      itemSeparator: 'dashes',
      sectionDecoration: 'none',
      sectionDecorations: [],
      sectionDivider: 'line',
      sectionTitleDecoration: 'underline-solid',
      backgroundTexture: 'chalkboard',
      pageBorder: 'none',
      priceFormat: 'right-aligned',
    },
  },
  {
    id: 'italian-trattoria',
    name: 'Italian Trattoria',
    description: 'Parchment with flourishes and inset border',
    stylePresetId: 'rustic-charm',
    decorations: {
      itemSeparator: 'none',
      sectionDecoration: 'none',
      sectionDecorations: [],
      sectionDivider: 'flourish',
      sectionTitleDecoration: 'ornamental-flourish',
      backgroundTexture: 'parchment',
      pageBorder: 'inset',
      priceFormat: 'right-aligned',
    },
  },
]
