import type { ColorScheme, TypographyConfig } from '@/models/layout'
import { createDefaultFontStyle } from '@/models/layout'

export interface StylePreset {
  id: string
  name: string
  description: string
  colorScheme: ColorScheme
  typography: TypographyConfig
}

export const stylePresets: StylePreset[] = [
  // 0. Black & White
  {
    id: 'black-white',
    name: 'Black & White',
    description: 'Clean black and white — no color ink needed',
    colorScheme: {
      background: '#FFFFFF',
      text: '#000000',
      accent: '#000000',
      border: '#000000',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 28,
        fontWeight: 700,
        color: '',
        textAlign: 'center',
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 14,
        color: '',
        textAlign: 'center',
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 18,
        fontWeight: 700,
        color: '',
      }),
      sectionSubtitle: createDefaultFontStyle({ fontSize: 12, color: '' }),
      itemName: createDefaultFontStyle({ fontSize: 12, fontWeight: 700, color: '' }),
      itemDescription: createDefaultFontStyle({ fontSize: 10, color: '' }),
      itemPrice: createDefaultFontStyle({ fontSize: 12, fontWeight: 700, textAlign: 'right', color: '' }),
      footer: createDefaultFontStyle({ fontSize: 9, textAlign: 'center', color: '' }),
    },
  },
  // 1. Classic Elegance
  {
    id: 'classic-elegance',
    name: 'Classic Elegance',
    description: 'Timeless cream and gold with serif typography',
    colorScheme: {
      background: '#FDFAF3',
      text: '#1C1208',
      accent: '#8B6914',
      border: '#D4C5A0',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 48,
        fontWeight: 700,
        color: '#1C1208',
        textAlign: 'center',
        letterSpacing: 0.5,
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 15,
        fontWeight: 400,
        color: '#8B6914',
        textAlign: 'center',
        letterSpacing: 2,
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 22,
        fontWeight: 700,
        color: '#8B6914',
        letterSpacing: 0.5,
      }),
      sectionSubtitle: createDefaultFontStyle({
        fontFamily: 'Times New Roman',
        fontSize: 12,
        fontWeight: 400,
        color: '#1C1208',
      }),
      itemName: createDefaultFontStyle({
        fontFamily: 'Times New Roman',
        fontSize: 14,
        fontWeight: 700,
        color: '#1C1208',
      }),
      itemDescription: createDefaultFontStyle({
        fontFamily: 'Times New Roman',
        fontSize: 11,
        fontWeight: 400,
        color: '#5A4A30',
      }),
      itemPrice: createDefaultFontStyle({
        fontFamily: 'Georgia',
        fontSize: 14,
        fontWeight: 700,
        color: '#8B6914',
        textAlign: 'right',
      }),
      footer: createDefaultFontStyle({
        fontFamily: 'Times New Roman',
        fontSize: 9,
        fontWeight: 400,
        color: '#5A4A30',
        textAlign: 'center',
      }),
    },
  },

  // 2. Modern Minimal
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean white with near-black text and blue-gray accents',
    colorScheme: {
      background: '#FFFFFF',
      text: '#111827',
      accent: '#4B5563',
      border: '#E5E7EB',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'Inter',
        fontSize: 44,
        fontWeight: 700,
        color: '#111827',
        textAlign: 'center',
        letterSpacing: -0.5,
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 400,
        color: '#4B5563',
        textAlign: 'center',
        letterSpacing: 1.5,
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 600,
        color: '#111827',
        letterSpacing: 0.5,
      }),
      sectionSubtitle: createDefaultFontStyle({
        fontFamily: 'system-ui',
        fontSize: 12,
        fontWeight: 400,
        color: '#4B5563',
      }),
      itemName: createDefaultFontStyle({
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 600,
        color: '#111827',
      }),
      itemDescription: createDefaultFontStyle({
        fontFamily: 'system-ui',
        fontSize: 11,
        fontWeight: 400,
        color: '#6B7280',
      }),
      itemPrice: createDefaultFontStyle({
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 600,
        color: '#111827',
        textAlign: 'right',
      }),
      footer: createDefaultFontStyle({
        fontFamily: 'system-ui',
        fontSize: 9,
        fontWeight: 400,
        color: '#9CA3AF',
        textAlign: 'center',
      }),
    },
  },

  // 3. Dark Luxe
  {
    id: 'dark-luxe',
    name: 'Dark Luxe',
    description: 'Dramatic dark background with gold accents and elegant serifs',
    colorScheme: {
      background: '#1A1A2E',
      text: '#F0E8D8',
      accent: '#C9A96E',
      border: '#3D3D5C',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'Playfair Display',
        fontSize: 48,
        fontWeight: 700,
        color: '#C9A96E',
        textAlign: 'center',
        letterSpacing: 0.5,
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Playfair Display',
        fontSize: 15,
        fontWeight: 400,
        color: '#F0E8D8',
        textAlign: 'center',
        letterSpacing: 2,
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'Playfair Display',
        fontSize: 22,
        fontWeight: 600,
        color: '#C9A96E',
      }),
      sectionSubtitle: createDefaultFontStyle({
        fontFamily: 'Lato',
        fontSize: 12,
        fontWeight: 400,
        color: '#F0E8D8',
      }),
      itemName: createDefaultFontStyle({
        fontFamily: 'Lato',
        fontSize: 15,
        fontWeight: 600,
        color: '#F0E8D8',
      }),
      itemDescription: createDefaultFontStyle({
        fontFamily: 'Lato',
        fontSize: 12,
        fontWeight: 400,
        color: '#B8AE9E',
      }),
      itemPrice: createDefaultFontStyle({
        fontFamily: 'Lato',
        fontSize: 15,
        fontWeight: 700,
        color: '#C9A96E',
        textAlign: 'right',
      }),
      footer: createDefaultFontStyle({
        fontFamily: 'Lato',
        fontSize: 9,
        fontWeight: 400,
        color: '#B8AE9E',
        textAlign: 'center',
      }),
    },
  },

  // 4. Rustic Charm
  {
    id: 'rustic-charm',
    name: 'Rustic Charm',
    description: 'Warm paper tones with brown text and amber accents',
    colorScheme: {
      background: '#F5F0E8',
      text: '#3A2615',
      accent: '#C17817',
      border: '#D8CDB8',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'Merriweather',
        fontSize: 44,
        fontWeight: 700,
        color: '#3A2615',
        textAlign: 'center',
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Merriweather',
        fontSize: 14,
        fontWeight: 300,
        color: '#C17817',
        textAlign: 'center',
        letterSpacing: 1.5,
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'Merriweather',
        fontSize: 20,
        fontWeight: 700,
        color: '#C17817',
      }),
      sectionSubtitle: createDefaultFontStyle({
        fontFamily: 'Open Sans',
        fontSize: 12,
        fontWeight: 400,
        color: '#3A2615',
      }),
      itemName: createDefaultFontStyle({
        fontFamily: 'Open Sans',
        fontSize: 14,
        fontWeight: 700,
        color: '#3A2615',
      }),
      itemDescription: createDefaultFontStyle({
        fontFamily: 'Open Sans',
        fontSize: 11,
        fontWeight: 400,
        color: '#6A5040',
      }),
      itemPrice: createDefaultFontStyle({
        fontFamily: 'Merriweather',
        fontSize: 14,
        fontWeight: 700,
        color: '#C17817',
        textAlign: 'right',
      }),
      footer: createDefaultFontStyle({
        fontFamily: 'Open Sans',
        fontSize: 9,
        fontWeight: 400,
        color: '#6A5040',
        textAlign: 'center',
      }),
    },
  },

  // 5. Fresh Garden
  {
    id: 'fresh-garden',
    name: 'Fresh Garden',
    description: 'Light green tones with leaf green accents and friendly fonts',
    colorScheme: {
      background: '#F0F8F0',
      text: '#1A3A1A',
      accent: '#3D7A3D',
      border: '#B8D8B8',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'Lora',
        fontSize: 46,
        fontWeight: 700,
        color: '#1A3A1A',
        textAlign: 'center',
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: 400,
        color: '#3D7A3D',
        textAlign: 'center',
        letterSpacing: 1.5,
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'Lora',
        fontSize: 22,
        fontWeight: 600,
        color: '#3D7A3D',
      }),
      sectionSubtitle: createDefaultFontStyle({
        fontFamily: 'Nunito',
        fontSize: 12,
        fontWeight: 400,
        color: '#1A3A1A',
      }),
      itemName: createDefaultFontStyle({
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: 700,
        color: '#1A3A1A',
      }),
      itemDescription: createDefaultFontStyle({
        fontFamily: 'Nunito',
        fontSize: 12,
        fontWeight: 400,
        color: '#3A5A3A',
      }),
      itemPrice: createDefaultFontStyle({
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: 700,
        color: '#3D7A3D',
        textAlign: 'right',
      }),
      footer: createDefaultFontStyle({
        fontFamily: 'Nunito',
        fontSize: 9,
        fontWeight: 400,
        color: '#3A5A3A',
        textAlign: 'center',
      }),
    },
  },

  // 6. Coastal Blue
  {
    id: 'coastal-blue',
    name: 'Coastal Blue',
    description: 'Off-white with navy text and ocean blue accents',
    colorScheme: {
      background: '#F5F8FC',
      text: '#0F2A4A',
      accent: '#1E6FA8',
      border: '#C0D4E8',
    },
    typography: {
      menuTitle: createDefaultFontStyle({
        fontFamily: 'DM Serif Display',
        fontSize: 48,
        fontWeight: 700,
        color: '#0F2A4A',
        textAlign: 'center',
        letterSpacing: 0.5,
      }),
      menuSubtitle: createDefaultFontStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 400,
        color: '#1E6FA8',
        textAlign: 'center',
        letterSpacing: 2,
      }),
      sectionTitle: createDefaultFontStyle({
        fontFamily: 'DM Serif Display',
        fontSize: 22,
        fontWeight: 600,
        color: '#1E6FA8',
      }),
      sectionSubtitle: createDefaultFontStyle({
        fontFamily: 'Montserrat',
        fontSize: 12,
        fontWeight: 400,
        color: '#0F2A4A',
      }),
      itemName: createDefaultFontStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 600,
        color: '#0F2A4A',
      }),
      itemDescription: createDefaultFontStyle({
        fontFamily: 'Montserrat',
        fontSize: 11,
        fontWeight: 400,
        color: '#3A5A7A',
      }),
      itemPrice: createDefaultFontStyle({
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 700,
        color: '#1E6FA8',
        textAlign: 'right',
      }),
      footer: createDefaultFontStyle({
        fontFamily: 'Montserrat',
        fontSize: 9,
        fontWeight: 400,
        color: '#3A5A7A',
        textAlign: 'center',
      }),
    },
  },
]
