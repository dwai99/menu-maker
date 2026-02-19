import { nanoid } from 'nanoid'
import { createDefaultPageLayout, createDefaultTypography, createDefaultFontStyle } from '@/models/layout'
import type { MenuData } from '@/models/menu'
import type { PageLayout } from '@/models/layout'

const cafeTemplate: {
  id: string
  name: string
  category: 'cafe'
  description: string
  tags?: string[]
  menuData: MenuData
  pageLayout: PageLayout
} = {
  id: nanoid(),
  name: 'Cafe',
  category: 'cafe',
  description: 'Morning cafe theme with warm neutrals and artisan charm',
  tags: ['light-theme', 'modern', 'multi-section'],
  menuData: {
    title: 'Morning Cafe',
    subtitle: 'Freshly Brewed Every Day',
    footer: '',
    sections: [
      {
        id: nanoid(),
        title: 'Morning Beverages',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Lavender Latte',
            description: 'Espresso, steamed oat milk, house-made lavender syrup, vanilla',
            price: '6.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Honey Cortado',
            description: 'Equal parts espresso and steamed milk, raw wildflower honey',
            price: '5.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Golden Turmeric Latte',
            description: 'Turmeric, ginger, cinnamon, steamed almond milk, black pepper',
            price: '6.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Cold Brew Float',
            description: 'Slow-steeped cold brew, vanilla bean ice cream, sparkling water',
            price: '7.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Breakfast Plates',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Avocado Benedict',
            description: 'Poached eggs, smashed avocado, toasted sourdough, hollandaise, microgreens',
            price: '16.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Ricotta Hotcakes',
            description: 'Fluffy ricotta pancakes, whipped honey butter, fresh berries, maple syrup',
            price: '14.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Shakshuka',
            description: 'Spiced tomato sauce, poached eggs, feta, fresh herbs, toasted pita',
            price: '15.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Granola Bowl',
            description: 'House granola, seasonal fruit, Greek yogurt, local honey, chia seeds',
            price: '12.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Pastries & Sweets',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Almond Croissant',
            description: 'Buttery croissant, frangipane filling, toasted almond slices, powdered sugar',
            price: '5.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Cardamom Morning Bun',
            description: 'Laminated dough, cardamom sugar, orange zest, flaky sea salt',
            price: '4.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Banana Walnut Loaf',
            description: 'Moist banana bread, toasted walnuts, brown butter glaze',
            price: '4.00',
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
    margins: { top: 0.625, right: 0.52, bottom: 0.625, left: 0.52 },
    sectionLayouts: [],
    colorScheme: {
      background: '#FDF6EC',
      text: '#3D2B1F',
      accent: '#B8860B',
      border: '#D4B896',
    },
    typography: {
      ...createDefaultTypography(),
      menuTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Lora',
        fontSize: 46,
        fontWeight: 700,
        color: '#3D2B1F',
        textAlign: 'center',
      },
      menuSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: 400,
        color: '#B8860B',
        letterSpacing: 1.5,
        textAlign: 'center',
      },
      sectionTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Lora',
        fontSize: 22,
        fontWeight: 600,
        color: '#B8860B',
      },
      sectionSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Nunito',
        fontSize: 12,
        fontWeight: 400,
        color: '#3D2B1F',
      },
      itemName: {
        ...createDefaultFontStyle(),
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: 700,
        color: '#3D2B1F',
      },
      itemDescription: {
        ...createDefaultFontStyle(),
        fontFamily: 'Nunito',
        fontSize: 12,
        fontWeight: 400,
        color: '#6B4E3D',
      },
      itemPrice: {
        ...createDefaultFontStyle(),
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: 700,
        color: '#B8860B',
        textAlign: 'right',
      },
      footer: {
        ...createDefaultFontStyle(),
        fontFamily: 'Nunito',
        fontSize: 9,
        fontWeight: 400,
        color: '#6B4E3D',
        textAlign: 'center',
      },
    },
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
  },
}

export default cafeTemplate
