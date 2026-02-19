import { nanoid } from 'nanoid'
import { createDefaultPageLayout, createDefaultTypography, createDefaultFontStyle } from '@/models/layout'
import type { MenuData } from '@/models/menu'
import type { PageLayout } from '@/models/layout'

const bakeryTemplate: {
  id: string
  name: string
  category: 'bakery'
  description: string
  tags?: string[]
  menuData: MenuData
  pageLayout: PageLayout
} = {
  id: nanoid(),
  name: 'Bakery',
  category: 'bakery',
  description: 'Artisan bakery theme with soft pink and warm brown tones',
  tags: ['light-theme', 'elegant', 'multi-section'],
  menuData: {
    title: 'Artisan Bakery',
    subtitle: 'Baked with Love Every Morning',
    footer: '',
    sections: [
      {
        id: nanoid(),
        title: 'Artisan Breads',
        subtitle: 'Baked fresh daily',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Sourdough Boule',
            description: 'Long-fermented sourdough, crispy crust, open crumb, naturally leavened',
            price: '8.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Seeded Rye Loaf',
            description: 'Dark rye flour, sunflower seeds, caraway, malt syrup, tangy and dense',
            price: '9.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Country Miche',
            description: 'Whole wheat and white flour blend, mild tanginess, hearty crust',
            price: '9.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Focaccia al Rosmarino',
            description: 'Olive oil-rich focaccia, fresh rosemary, flaky sea salt, roasted garlic',
            price: '6.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Pastries',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Pain au Chocolat',
            description: 'Laminated butter dough, two dark chocolate batons, perfectly caramelized',
            price: '5.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Kouign-Amann',
            description: 'Breton butter cake, caramelized sugar crust, flaky layers',
            price: '5.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Pistachio Madeleine',
            description: 'French butter cake, pistachio cream, lemon zest, dusted with powdered sugar',
            price: '3.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Seasonal Danish',
            description: 'Laminated pastry, pastry cream, seasonal fruit, apricot glaze',
            price: '5.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Cakes & Tarts',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Red Velvet Cake',
            description: 'Classic red velvet, cream cheese frosting, slice',
            price: '7.00',
            priceLabel: 'per slice',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Lemon Curd Tart',
            description: 'Buttery shortcrust shell, tangy lemon curd, Italian meringue',
            price: '6.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Strawberry Chantilly',
            description: 'Vanilla genoise, fresh strawberries, lightly sweetened whipped cream',
            price: '7.50',
            priceLabel: 'per slice',
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
      background: '#FFF5F0',
      text: '#4A3228',
      accent: '#D4A574',
      border: '#E8D5C4',
    },
    typography: {
      ...createDefaultTypography(),
      menuTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Dancing Script',
        fontSize: 52,
        fontWeight: 700,
        color: '#4A3228',
        textAlign: 'center',
      },
      menuSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Montserrat',
        fontSize: 13,
        fontWeight: 400,
        color: '#D4A574',
        letterSpacing: 2,
        textAlign: 'center',
      },
      sectionTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Dancing Script',
        fontSize: 26,
        fontWeight: 700,
        color: '#D4A574',
      },
      sectionSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Montserrat',
        fontSize: 11,
        fontWeight: 400,
        color: '#4A3228',
      },
      itemName: {
        ...createDefaultFontStyle(),
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 600,
        color: '#4A3228',
      },
      itemDescription: {
        ...createDefaultFontStyle(),
        fontFamily: 'Montserrat',
        fontSize: 11,
        fontWeight: 400,
        color: '#7A5848',
      },
      itemPrice: {
        ...createDefaultFontStyle(),
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 700,
        color: '#D4A574',
        textAlign: 'right',
      },
      footer: {
        ...createDefaultFontStyle(),
        fontFamily: 'Montserrat',
        fontSize: 9,
        fontWeight: 400,
        color: '#7A5848',
        textAlign: 'center',
      },
    },
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
  },
}

export default bakeryTemplate
