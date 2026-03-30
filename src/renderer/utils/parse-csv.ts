import { nanoid } from 'nanoid'
import type { MenuSection, MenuItem, DietaryIcon, ItemBadge } from '@/models/menu'

const VALID_DIETARY: Set<string> = new Set(['v', 'vg', 'gf', 'df', 'nuts', 'spicy'])
const VALID_BADGES: Set<string> = new Set(['new', 'popular', 'chefs-pick', 'seasonal'])

/** Parse a single CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

export interface CsvParseResult {
  sections: MenuSection[]
  itemCount: number
  errors: string[]
}

export function parseCsvMenu(csvText: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  const errors: string[] = []

  if (lines.length < 2) {
    return { sections: [], itemCount: 0, errors: ['CSV must have a header row and at least one data row'] }
  }

  // Parse header to find column indices
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim())
  const colSection = header.indexOf('section')
  const colItem = header.indexOf('item')
  const colDesc = header.indexOf('description')
  const colPrice = header.indexOf('price')
  const colTags = header.indexOf('tags')
  const colDietary = header.indexOf('dietary')
  const colBadges = header.indexOf('badges')

  if (colItem === -1) {
    return { sections: [], itemCount: 0, errors: ['CSV must have an "Item" column'] }
  }

  const sections: MenuSection[] = []
  let currentSection: MenuSection | null = null
  let itemCount = 0

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    const sectionName = colSection >= 0 ? (fields[colSection] || '') : ''
    const itemName = fields[colItem] || ''
    const description = colDesc >= 0 ? (fields[colDesc] || '') : ''
    const price = colPrice >= 0 ? (fields[colPrice] || '').replace(/[^0-9.]/g, '') : ''

    // Start new section if section column has value
    if (sectionName) {
      currentSection = {
        id: nanoid(),
        title: sectionName,
        subtitle: '',
        items: [],
        footnote: '',
      }
      sections.push(currentSection)
    }

    // Add item if item column has value
    if (itemName) {
      if (!currentSection) {
        // Create default section if none exists
        currentSection = {
          id: nanoid(),
          title: 'Menu Items',
          subtitle: '',
          items: [],
          footnote: '',
        }
        sections.push(currentSection)
      }

      const item: MenuItem = {
        id: nanoid(),
        name: itemName,
        description,
        price,
        priceLabel: '',
        tags: [],
        isAvailable: true,
      }

      // Parse tags
      if (colTags >= 0 && fields[colTags]) {
        item.tags = fields[colTags].split(/[,;]/).map(t => t.trim()).filter(Boolean)
      }

      // Parse dietary icons
      if (colDietary >= 0 && fields[colDietary]) {
        const icons = fields[colDietary].split(/[,;]/).map(d => d.trim().toLowerCase()).filter(d => VALID_DIETARY.has(d))
        if (icons.length > 0) item.dietaryIcons = icons as DietaryIcon[]
      }

      // Parse badges
      if (colBadges >= 0 && fields[colBadges]) {
        const badges = fields[colBadges].split(/[,;]/).map(b => b.trim().toLowerCase()).filter(b => VALID_BADGES.has(b))
        if (badges.length > 0) item.badges = badges as ItemBadge[]
      }

      currentSection.items.push(item)
      itemCount++
    }
  }

  if (sections.length === 0) {
    errors.push('No sections or items found in CSV')
  }

  return { sections, itemCount, errors }
}

/** Generate a sample CSV string for download */
export function generateSampleCsv(): string {
  return `Section,Item,Description,Price,Dietary,Badges
Appetizers,,,,,
,Bruschetta,Toasted bread with tomatoes and basil,8.99,v,
,Calamari,Lightly fried with marinara sauce,12.99,,popular
Entrees,,,,,
,Grilled Salmon,Atlantic salmon with lemon butter sauce,24.99,gf,chefs-pick
,Pasta Primavera,Seasonal vegetables in garlic cream sauce,18.99,v,
,NY Strip Steak,12oz hand-cut with loaded baked potato,34.99,,
Desserts,,,,,
,Tiramisu,Classic Italian coffee dessert,10.99,,new
,Chocolate Lava Cake,Warm center with vanilla ice cream,11.99,v,`
}
