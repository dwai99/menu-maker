export interface FontEntry {
  family: string
  importPath: string
  category: 'serif' | 'sans-serif' | 'display' | 'script'
}

export const FONT_REGISTRY: FontEntry[] = [
  // Serif
  { family: 'Playfair Display', importPath: '@fontsource/playfair-display', category: 'serif' },
  { family: 'Lora', importPath: '@fontsource/lora', category: 'serif' },
  { family: 'Merriweather', importPath: '@fontsource/merriweather', category: 'serif' },
  { family: 'Cormorant Garamond', importPath: '@fontsource/cormorant-garamond', category: 'serif' },
  { family: 'EB Garamond', importPath: '@fontsource/eb-garamond', category: 'serif' },
  { family: 'Crimson Text', importPath: '@fontsource/crimson-text', category: 'serif' },
  { family: 'Libre Baskerville', importPath: '@fontsource/libre-baskerville', category: 'serif' },
  { family: 'Spectral', importPath: '@fontsource/spectral', category: 'serif' },
  { family: 'Bitter', importPath: '@fontsource/bitter', category: 'serif' },
  { family: 'Source Serif 4', importPath: '@fontsource/source-serif-4', category: 'serif' },
  { family: 'Noto Serif', importPath: '@fontsource/noto-serif', category: 'serif' },
  { family: 'Alegreya', importPath: '@fontsource/alegreya', category: 'serif' },

  // Sans-serif
  { family: 'Montserrat', importPath: '@fontsource/montserrat', category: 'sans-serif' },
  { family: 'Raleway', importPath: '@fontsource/raleway', category: 'sans-serif' },
  { family: 'Open Sans', importPath: '@fontsource/open-sans', category: 'sans-serif' },
  { family: 'Roboto', importPath: '@fontsource/roboto', category: 'sans-serif' },
  { family: 'Lato', importPath: '@fontsource/lato', category: 'sans-serif' },
  { family: 'Inter', importPath: '@fontsource/inter', category: 'sans-serif' },
  { family: 'Poppins', importPath: '@fontsource/poppins', category: 'sans-serif' },
  { family: 'Nunito', importPath: '@fontsource/nunito', category: 'sans-serif' },
  { family: 'Work Sans', importPath: '@fontsource/work-sans', category: 'sans-serif' },
  { family: 'DM Sans', importPath: '@fontsource/dm-sans', category: 'sans-serif' },
  { family: 'Josefin Sans', importPath: '@fontsource/josefin-sans', category: 'sans-serif' },

  // Display
  { family: 'DM Serif Display', importPath: '@fontsource/dm-serif-display', category: 'display' },
  { family: 'Cinzel', importPath: '@fontsource/cinzel', category: 'display' },

  // Script
  { family: 'Great Vibes', importPath: '@fontsource/great-vibes', category: 'script' },
  { family: 'Dancing Script', importPath: '@fontsource/dancing-script', category: 'script' },
  { family: 'Parisienne', importPath: '@fontsource/parisienne', category: 'script' },
  { family: 'Tangerine', importPath: '@fontsource/tangerine', category: 'script' },
  { family: 'Sacramento', importPath: '@fontsource/sacramento', category: 'script' },
]

export const SYSTEM_FONTS = [
  { family: 'Georgia', category: 'serif' as const },
  { family: 'Times New Roman', category: 'serif' as const },
  { family: 'system-ui', category: 'sans-serif' as const },
  { family: 'Arial', category: 'sans-serif' as const },
  { family: 'Helvetica', category: 'sans-serif' as const },
]

export function getAllFontFamilies(): string[] {
  return [
    ...SYSTEM_FONTS.map((f) => f.family),
    ...FONT_REGISTRY.map((f) => f.family),
  ]
}

export function getFontsByCategory(): Map<string, { family: string; category: string }[]> {
  const groups = new Map<string, { family: string; category: string }[]>()

  // System fonts first
  const systemGroup: { family: string; category: string }[] = SYSTEM_FONTS.map(f => ({ family: f.family, category: f.category }))
  groups.set('System', systemGroup)

  // Group FONT_REGISTRY by category
  const categoryLabels: Record<string, string> = {
    'serif': 'Serif',
    'sans-serif': 'Sans-Serif',
    'display': 'Display',
    'script': 'Script',
  }

  for (const entry of FONT_REGISTRY) {
    const label = categoryLabels[entry.category] || entry.category
    if (!groups.has(label)) {
      groups.set(label, [])
    }
    groups.get(label)!.push({ family: entry.family, category: entry.category })
  }

  return groups
}
