import { nanoid } from 'nanoid'
import { createDefaultPageLayout, createDefaultTypography, createDefaultFontStyle } from '@/models/layout'
import type { MenuData } from '@/models/menu'
import type { PageLayout } from '@/models/layout'

const sushiTemplate: {
  id: string
  name: string
  category: 'sushi'
  description: string
  tags?: string[]
  menuData: MenuData
  pageLayout: PageLayout
} = {
  id: nanoid(),
  name: 'Sushi Bar',
  category: 'sushi',
  description: 'Japanese sushi bar theme with clean indigo and white styling',
  tags: ['light-theme', 'modern', 'multi-section'],
  menuData: {
    title: 'Sushi Bar',
    subtitle: 'Omakase & Specialty Rolls',
    footer: '',
    sections: [
      {
        id: nanoid(),
        title: 'Nigiri',
        subtitle: 'Two pieces per order',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Salmon Nigiri',
            description: 'Atlantic salmon, seasoned sushi rice, wasabi',
            price: '6.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Bluefin Tuna Nigiri',
            description: 'Premium bluefin tuna, sushi rice, fresh wasabi',
            price: '9.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Yellowtail Nigiri',
            description: 'Hamachi, sushi rice, ponzu, thin jalapeño',
            price: '7.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Uni Nigiri',
            description: 'Fresh sea urchin, sushi rice, shiso leaf, sea salt',
            price: '14.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Ikura Nigiri',
            description: 'Salmon roe, sushi rice, nori band, sesame',
            price: '8.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Specialty Rolls',
        subtitle: 'Eight pieces per roll',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Dragon Roll',
            description: 'Shrimp tempura inside, avocado on top, eel sauce, tobiko',
            price: '18.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Spicy Tuna Crunch',
            description: 'Spicy tuna, cucumber, tempura crunch, sriracha aioli, sesame',
            price: '16.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Rainbow Roll',
            description: 'California roll base, assorted fish and avocado on top',
            price: '20.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Truffle Wagyu Roll',
            description: 'Wagyu beef, truffle aioli, crispy shallots, micro wasabi greens',
            price: '28.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Beverages',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Junmai Daiginjo Sake',
            description: 'Premium fragrant sake, floral and fruity notes, serve chilled',
            price: '24.00',
            priceLabel: 'Glass $12',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Japanese Whisky Highball',
            description: 'Suntory Toki whisky, sparkling water, lemon peel',
            price: '16.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Matcha Lemonade',
            description: 'Ceremonial grade matcha, fresh lemon, honey, sparkling water',
            price: '8.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
    ],
  },
  pageLayout: {
    ...createDefaultPageLayout(),
    pageSize: 'letter',
    orientation: 'portrait',
    margins: { top: 0.625, right: 0.57, bottom: 0.625, left: 0.57 },
    sectionLayouts: [],
    colorScheme: {
      background: '#FFFFFF',
      text: '#1A1A2E',
      accent: '#3B3B98',
      border: '#E8E8F0',
    },
    typography: {
      ...createDefaultTypography(),
      menuTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'DM Serif Display',
        fontSize: 48,
        fontWeight: 700,
        color: '#1A1A2E',
        textAlign: 'center',
      },
      menuSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Noto Sans JP',
        fontSize: 14,
        fontWeight: 400,
        color: '#3B3B98',
        letterSpacing: 2,
        textAlign: 'center',
      },
      sectionTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'DM Serif Display',
        fontSize: 22,
        fontWeight: 600,
        color: '#3B3B98',
      },
      sectionSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Noto Sans JP',
        fontSize: 11,
        fontWeight: 400,
        color: '#1A1A2E',
      },
      itemName: {
        ...createDefaultFontStyle(),
        fontFamily: 'Noto Sans JP',
        fontSize: 14,
        fontWeight: 700,
        color: '#1A1A2E',
      },
      itemDescription: {
        ...createDefaultFontStyle(),
        fontFamily: 'Noto Sans JP',
        fontSize: 11,
        fontWeight: 400,
        color: '#4A4A6A',
      },
      itemPrice: {
        ...createDefaultFontStyle(),
        fontFamily: 'Noto Sans JP',
        fontSize: 14,
        fontWeight: 700,
        color: '#3B3B98',
        textAlign: 'right',
      },
      footer: {
        ...createDefaultFontStyle(),
        fontFamily: 'Noto Sans JP',
        fontSize: 9,
        fontWeight: 400,
        color: '#4A4A6A',
        textAlign: 'center',
      },
    },
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
  },
}

export default sushiTemplate
