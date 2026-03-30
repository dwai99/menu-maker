import type {
  ColorScheme,
  TypographyConfig,
  ItemSeparator,
  SectionDecoration,
  SectionDivider,
  SectionTitleDecoration,
  BackgroundTexture,
  PageBorder,
  PriceFormat,
} from '@/models/layout'

export interface BrandingPreset {
  id: string
  name: string
  createdAt: string
  colorScheme: ColorScheme
  typography: TypographyConfig
  decorations: {
    itemSeparator: ItemSeparator
    sectionDecoration: SectionDecoration
    sectionDivider: SectionDivider
    sectionTitleDecoration?: SectionTitleDecoration
    backgroundTexture: BackgroundTexture
    pageBorder: PageBorder
    priceFormat: PriceFormat
  }
}

const STORAGE_KEY = 'menu-maker:branding-presets'

export function loadBrandingPresets(): BrandingPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveBrandingPreset(preset: BrandingPreset): void {
  const existing = loadBrandingPresets()
  existing.push(preset)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function deleteBrandingPreset(id: string): void {
  const existing = loadBrandingPresets().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}
