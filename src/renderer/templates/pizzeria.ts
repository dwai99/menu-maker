import { nanoid } from 'nanoid'
import { createDefaultPageLayout, createDefaultTypography, createDefaultFontStyle } from '@/models/layout'
import type { MenuData } from '@/models/menu'
import type { PageLayout } from '@/models/layout'

const pizzeriaTemplate: {
  id: string
  name: string
  category: 'pizzeria'
  description: string
  tags?: string[]
  menuData: MenuData
  pageLayout: PageLayout
} = {
  id: nanoid(),
  name: 'Pizzeria',
  category: 'pizzeria',
  description: 'Italian pizzeria theme with classic red and cream styling',
  tags: ['light-theme', 'elegant', 'multi-section'],
  menuData: {
    title: 'La Pizzeria',
    subtitle: 'Autentica Cucina Italiana',
    footer: '',
    sections: [
      {
        id: nanoid(),
        title: 'Antipasti',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Bruschetta al Pomodoro',
            description: 'Grilled sourdough, San Marzano tomatoes, fresh basil, extra virgin olive oil, sea salt',
            price: '10.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Burrata e Prosciutto',
            description: 'Fresh burrata, 24-month Prosciutto di Parma, arugula, aged balsamic, grilled bread',
            price: '18.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Arancini al Ragù',
            description: 'Crispy risotto balls, slow-cooked beef ragù, mozzarella, spiced tomato dipping sauce',
            price: '13.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Pizze Classiche',
        subtitle: 'Stone-baked at 900°F',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Margherita',
            description: 'San Marzano tomato sauce, fior di latte mozzarella, fresh basil, olive oil',
            price: '16.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Diavola',
            description: 'Tomato sauce, mozzarella, spicy Calabrian soppressata, chili oil, fresh oregano',
            price: '19.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Quattro Formaggi',
            description: 'Mozzarella, gorgonzola, parmigiano-reggiano, smoked scamorza, black pepper',
            price: '20.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Prosciutto e Funghi',
            description: 'Tomato sauce, mozzarella, Prosciutto di Parma, wild mushrooms, truffle oil',
            price: '22.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Verdure di Stagione',
            description: 'White base, seasonal roasted vegetables, stracciatella, pine nuts, basil pesto',
            price: '18.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Dolci',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Tiramisu',
            description: 'Classic house-made, espresso-soaked savoiardi, mascarpone cream, cocoa',
            price: '9.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Panna Cotta',
            description: 'Vanilla bean panna cotta, seasonal berry compote, mint',
            price: '8.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Cannoli Siciliani',
            description: 'Crispy shells, sweet ricotta, candied orange peel, pistachio, chocolate chips',
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
    margins: { top: 0.625, right: 0.52, bottom: 0.625, left: 0.52 },
    sectionLayouts: [],
    colorScheme: {
      background: '#FFF8F0',
      text: '#2D1A0E',
      accent: '#C41E3A',
      border: '#E8C9B0',
    },
    typography: {
      ...createDefaultTypography(),
      menuTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Playfair Display',
        fontSize: 50,
        fontWeight: 700,
        color: '#C41E3A',
        textAlign: 'center',
      },
      menuSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Playfair Display',
        fontSize: 16,
        fontWeight: 400,
        color: '#2D1A0E',
        letterSpacing: 2,
        textAlign: 'center',
      },
      sectionTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Playfair Display',
        fontSize: 24,
        fontWeight: 600,
        color: '#C41E3A',
      },
      sectionSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Open Sans',
        fontSize: 11,
        fontWeight: 400,
        color: '#2D1A0E',
      },
      itemName: {
        ...createDefaultFontStyle(),
        fontFamily: 'Open Sans',
        fontSize: 15,
        fontWeight: 600,
        color: '#2D1A0E',
      },
      itemDescription: {
        ...createDefaultFontStyle(),
        fontFamily: 'Open Sans',
        fontSize: 12,
        fontWeight: 400,
        color: '#6A4030',
      },
      itemPrice: {
        ...createDefaultFontStyle(),
        fontFamily: 'Open Sans',
        fontSize: 15,
        fontWeight: 700,
        color: '#C41E3A',
        textAlign: 'right',
      },
      footer: {
        ...createDefaultFontStyle(),
        fontFamily: 'Open Sans',
        fontSize: 9,
        fontWeight: 400,
        color: '#6A4030',
        textAlign: 'center',
      },
    },
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
  },
}

export default pizzeriaTemplate
