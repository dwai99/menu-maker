import { nanoid } from 'nanoid'

export interface PriceVariant {
  id: string      // nanoid
  label: string   // "Half", "Full", "6pc", "Glass", "Bottle"
  price: string   // "9.99"
}

export function createPriceVariant(): PriceVariant {
  return { id: nanoid(), label: '', price: '' }
}

export type DietaryIcon = 'v' | 'vg' | 'gf' | 'df' | 'nuts' | 'spicy'

export type ItemBadge = 'new' | 'popular' | 'chefs-pick' | 'seasonal'
export const ITEM_BADGE_META: Record<ItemBadge, { label: string; abbr: string; color: string; bgColor: string }> = {
  'new':        { label: 'New',         abbr: 'NEW',         color: '#fff', bgColor: '#22c55e' },
  'popular':    { label: 'Popular',     abbr: 'POPULAR',     color: '#fff', bgColor: '#f59e0b' },
  'chefs-pick': { label: "Chef's Pick", abbr: "CHEF'S PICK", color: '#fff', bgColor: '#8b5cf6' },
  'seasonal':   { label: 'Seasonal',    abbr: 'SEASONAL',    color: '#fff', bgColor: '#06b6d4' },
}

export const DIETARY_ICON_META: Record<DietaryIcon, { label: string; abbr: string; color: string }> = {
  v: { label: 'Vegetarian', abbr: 'V', color: '#16a34a' },
  vg: { label: 'Vegan', abbr: 'VG', color: '#15803d' },
  gf: { label: 'Gluten Free', abbr: 'GF', color: '#ca8a04' },
  df: { label: 'Dairy Free', abbr: 'DF', color: '#2563eb' },
  nuts: { label: 'Contains Nuts', abbr: 'N', color: '#9333ea' },
  spicy: { label: 'Spicy', abbr: '🌶', color: '#dc2626' },
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: string
  priceLabel: string
  tags: string[]
  dietaryIcons?: DietaryIcon[]
  badges?: ItemBadge[]
  isHighlighted?: boolean
  variants?: PriceVariant[]
  isAvailable: boolean
}

export interface SectionColorOverride {
  accent?: string
  background?: string
}

export interface MenuSection {
  id: string
  title: string
  subtitle: string
  items: MenuItem[]
  footnote: string
  colorOverride?: SectionColorOverride
  icon?: string  // emoji displayed next to section title
}

export interface LogoData {
  dataUrl: string  // base64 data URL
  width: number    // display width in px
  height: number   // display height in px
  x: number        // percentage from left of content area (0-100)
  y: number        // percentage from top of content area (0-100)
}

export interface HeaderElementPosition {
  x: number   // % of content area width (0-100)
  y: number   // % of content area height (0-100)
  width: number // % of content area width
}

export interface MenuData {
  title: string
  subtitle: string
  sections: MenuSection[]
  footer: string
  logo?: LogoData
  titlePosition?: HeaderElementPosition
  subtitlePosition?: HeaderElementPosition
}

export function createMenuItem(): MenuItem {
  return {
    id: nanoid(),
    name: '',
    description: '',
    price: '',
    priceLabel: '',
    tags: [],
    isAvailable: true,
  }
}

export function createMenuSection(): MenuSection {
  return {
    id: nanoid(),
    title: '',
    subtitle: '',
    items: [],
    footnote: '',
  }
}

export function createDefaultMenuData(): MenuData {
  return {
    title: "ALARY'S CRAFTED COMFORT",
    subtitle: '(651) 224-7717 \u2022 www.alarys.com \u2022 139 7th St E, Saint Paul, MN, 55101',
    sections: [
      {
        id: nanoid(),
        title: 'APPS',
        subtitle: '',
        footnote: '',
        items: [
          { id: nanoid(), name: 'Wings', description: 'Tossed in Buffalo, Jerk, BBQ, or Korean BBQ sauce. Served with celery and your choice of bleu cheese or ranch.', price: '15.49', priceLabel: '', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Firecracker Shrimp', description: 'Crispy fried shrimp hand-tossed in our signature Firecracker Sauce. Served on a bed of honey-lime slaw.', price: '13.99', priceLabel: '', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Cheese Curds', description: 'Beer battered Ellsworth Cheese Curds served with a side of Ranch.', price: '10.99', priceLabel: '', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Nachos', description: 'House-made tortilla chips, jalapeno queso, pico de gallo, shredded lettuce, elote crema, and cilantro.', price: '15.99', priceLabel: 'Half order $9.49', tags: [], isAvailable: true },
        ],
      },
      {
        id: nanoid(),
        title: 'SALADS',
        subtitle: 'Add to any salad: chicken $3.00, fried shrimp $4.00',
        footnote: '',
        items: [
          { id: nanoid(), name: 'Apple and Berry Salad', description: 'Spring mix, candied walnuts, seasonal berries, apple, red onion, goat cheese and strawberry vinaigrette.', price: '14.99', priceLabel: 'Half Salad $8.99', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Caesar Salad', description: 'Romaine tossed with Caesar dressing and topped with garlic croutons and shaved parmesan.', price: '13.99', priceLabel: 'Half Salad $7.99', tags: [], isAvailable: true },
        ],
      },
      {
        id: nanoid(),
        title: 'HANDHELDS',
        subtitle: '',
        footnote: 'Served with kettle chips. Substitute fries, tots, or small house salad $2.',
        items: [
          { id: nanoid(), name: 'Chicago Beef', description: 'Shaved ribeye, provolone cheese, spicy giardiniera on an Italian roll. Au Jus for dipping.', price: '17.49', priceLabel: '', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Pork Carnitas Tacos', description: '3 Tacos. Braised Pork, Pico De Gallo, Pickled Red Onion. Served with Mexican rice.', price: '15.99', priceLabel: '', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Storm Burger', description: 'Topped with provolone cheese, bacon, pickled red onion, avocado smash, lettuce and tomato.', price: '15.99', priceLabel: '', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Elote Fried Chicken Sandwich', description: 'Roasted corn, cotija cheese, elote aioli.', price: '15.99', priceLabel: '', tags: [], isAvailable: true },
        ],
      },
      {
        id: nanoid(),
        title: 'PASTAS',
        subtitle: '',
        footnote: 'Served with toasted garlic bread.',
        items: [
          { id: nanoid(), name: 'Mac & Cheese', description: 'Cavatappi pasta, smothered in five cheese cream sauce, smoked bacon topped with toasted bread crumb.', price: '15.99', priceLabel: 'Half $8.99', tags: [], isAvailable: true },
          { id: nanoid(), name: 'Wild Serrano Chicken', description: 'Cavatappi pasta, marinated chicken, spicy serrano cream sauce, roasted corn relish, and cotija cheese.', price: '18.99', priceLabel: 'Half $9.99', tags: [], isAvailable: true },
        ],
      },
    ],
    footer: 'February 12, 2026',
  }
}
