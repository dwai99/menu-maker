import { nanoid } from 'nanoid'
import { createDefaultPageLayout, createDefaultTypography, createDefaultFontStyle } from '@/models/layout'
import type { MenuData } from '@/models/menu'
import type { PageLayout } from '@/models/layout'

const taqueriaTemplate: {
  id: string
  name: string
  category: 'taqueria'
  description: string
  tags?: string[]
  menuData: MenuData
  pageLayout: PageLayout
} = {
  id: nanoid(),
  name: 'Taqueria',
  category: 'taqueria',
  description: 'Mexican taqueria theme with warm green and orange accents',
  tags: ['light-theme', 'modern', 'multi-section'],
  menuData: {
    title: 'La Taqueria',
    subtitle: 'Auténtica Comida Mexicana',
    footer: '',
    sections: [
      {
        id: nanoid(),
        title: 'Tacos',
        subtitle: 'Corn tortilla, cilantro, onion, salsa verde',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Al Pastor',
            description: 'Marinated pork, achiote, pineapple, white onion, fresh cilantro',
            price: '4.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Carnitas',
            description: 'Slow-braised pork shoulder, crispy edges, marinated red onion, avocado',
            price: '4.75',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Carne Asada',
            description: 'Grilled skirt steak, lime, cilantro, roasted jalapeño salsa',
            price: '5.25',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Birria',
            description: 'Braised beef consommé taco, Oaxacan cheese, dipping broth',
            price: '5.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Rajas con Crema',
            description: 'Roasted poblano strips, crema mexicana, corn, Oaxacan cheese',
            price: '4.25',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Burritos & Bowls',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Carnitas Burrito',
            description: 'Flour tortilla, carnitas, rice, black beans, pico de gallo, sour cream, guac',
            price: '13.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Pollo Asado Bowl',
            description: 'Grilled chicken thigh, cilantro-lime rice, pinto beans, salsa roja, corn relish',
            price: '12.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Veggie Bowl',
            description: 'Seasoned rice, black beans, roasted peppers, guacamole, vinegar-cured vegetables',
            price: '11.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
        ],
      },
      {
        id: nanoid(),
        title: 'Aguas & Bebidas',
        subtitle: '',
        footnote: '',
        items: [
          {
            id: nanoid(),
            name: 'Horchata',
            description: 'Rice milk, cinnamon, vanilla, lightly sweetened, served cold',
            price: '4.00',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Agua de Jamaica',
            description: 'Hibiscus flower tea, lime, natural cane sugar',
            price: '3.50',
            priceLabel: '',
            tags: [],
            isAvailable: true,
          },
          {
            id: nanoid(),
            name: 'Michelada',
            description: 'Light beer, lime juice, hot sauce, Worcestershire, Tajín rim',
            price: '7.00',
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
      background: '#FFF9F0',
      text: '#2D1B0E',
      accent: '#D4772C',
      border: '#C8D6A0',
    },
    typography: {
      ...createDefaultTypography(),
      menuTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Bitter',
        fontSize: 48,
        fontWeight: 700,
        color: '#D4772C',
        textAlign: 'center',
      },
      menuSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Work Sans',
        fontSize: 14,
        fontWeight: 400,
        color: '#2D1B0E',
        letterSpacing: 1.5,
        textAlign: 'center',
      },
      sectionTitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Bitter',
        fontSize: 22,
        fontWeight: 600,
        color: '#D4772C',
      },
      sectionSubtitle: {
        ...createDefaultFontStyle(),
        fontFamily: 'Work Sans',
        fontSize: 11,
        fontWeight: 400,
        color: '#2D1B0E',
      },
      itemName: {
        ...createDefaultFontStyle(),
        fontFamily: 'Work Sans',
        fontSize: 15,
        fontWeight: 600,
        color: '#2D1B0E',
      },
      itemDescription: {
        ...createDefaultFontStyle(),
        fontFamily: 'Work Sans',
        fontSize: 12,
        fontWeight: 400,
        color: '#5C3820',
      },
      itemPrice: {
        ...createDefaultFontStyle(),
        fontFamily: 'Work Sans',
        fontSize: 15,
        fontWeight: 700,
        color: '#D4772C',
        textAlign: 'right',
      },
      footer: {
        ...createDefaultFontStyle(),
        fontFamily: 'Work Sans',
        fontSize: 9,
        fontWeight: 400,
        color: '#5C3820',
        textAlign: 'center',
      },
    },
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
  },
}

export default taqueriaTemplate
