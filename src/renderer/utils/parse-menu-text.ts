import { nanoid } from 'nanoid'
import type { MenuData, MenuSection, MenuItem } from '@/models/menu'

/**
 * Parse extracted text (from PDF or OCR) into structured menu data using heuristics.
 *
 * Strategy:
 * 1. Split text into non-empty lines
 * 2. Detect section headers (ALL CAPS short lines without prices)
 * 3. Detect items (lines with prices like $12.99)
 * 4. Associate descriptions with the preceding item
 * 5. Detect subtitles and footnotes near section boundaries
 */
export function parseMenuText(text: string): MenuData {
  const rawLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

  // Price patterns
  const priceRegex = /\$\s*(\d+\.?\d{0,2})/
  const multiPriceRegex = /\$\s*\d+\.?\d{0,2}/g

  // Detect if a line is likely a section header
  const isSectionHeader = (line: string): boolean => {
    // Skip lines with prices
    if (priceRegex.test(line)) return false
    // Skip very long lines (descriptions)
    if (line.length > 50) return false
    // Skip very short lines
    if (line.length < 2) return false

    // All caps and reasonable length
    const alphaOnly = line.replace(/[^a-zA-Z]/g, '')
    if (alphaOnly.length > 2 && alphaOnly === alphaOnly.toUpperCase() && line.length < 40) {
      return true
    }

    // Common section keywords
    const sectionKeywords =
      /^(appetizers?|apps?|starters?|entrees?|mains?|main courses?|desserts?|beverages?|drinks?|salads?|soups?|sides?|handhelds?|sandwiches?|burgers?|pastas?|pizza|specials?|brunch|breakfast|lunch|dinner|cocktails?|wine|beer|spirits?|from the )/i
    if (sectionKeywords.test(line) && line.length < 40) {
      return true
    }

    return false
  }

  // Detect if a line looks like a menu title (very first prominent text)
  const isMenuTitle = (line: string, index: number): boolean => {
    if (index > 5) return false
    if (priceRegex.test(line)) return false
    if (line.length > 80) return false
    // Prominent if it's short-ish and early
    return line.length > 3 && line.length < 60
  }

  // Extract item name and price(s) from a line
  const parseItemLine = (
    line: string
  ): { name: string; price: string; priceLabel: string } | null => {
    const prices = line.match(multiPriceRegex)
    if (!prices || prices.length === 0) return null

    // Get the item name (everything before the first price)
    const firstPriceIndex = line.indexOf(prices[0])
    let name = line.substring(0, firstPriceIndex).trim()

    // Clean up trailing dots, dashes used as separators
    name = name.replace(/[\s.\-–—]+$/, '').trim()

    if (name.length < 2) return null

    // Primary price is the first one
    const primaryPrice = prices[0].replace(/\$\s*/, '').trim()

    // If there are multiple prices, build a priceLabel
    let priceLabel = ''
    if (prices.length > 1) {
      // Try to extract context around prices for the label
      const afterFirstPrice = line.substring(firstPriceIndex + prices[0].length)
      const labelParts: string[] = []

      // Look for patterns like "Half order $9.49" or "Cup $5.50 / Bowl $8.50"
      for (let i = 1; i < prices.length; i++) {
        const priceIdx = afterFirstPrice.indexOf(prices[i])
        if (priceIdx >= 0) {
          const prefix = afterFirstPrice.substring(0, priceIdx).trim().replace(/^[/|,]\s*/, '')
          if (prefix) {
            labelParts.push(`${prefix} ${prices[i]}`)
          } else {
            labelParts.push(prices[i])
          }
        }
      }

      if (labelParts.length > 0) {
        priceLabel = labelParts.join(' / ')
      }
    }

    return { name, price: primaryPrice, priceLabel }
  }

  // Detect subtitle-like text (short, descriptive, often about add-ons)
  const isSubtitleText = (line: string): boolean => {
    if (priceRegex.test(line) && line.length > 50) return false
    const addOnPattern = /^(add|served|includes|choice of|all .* come with|substitute|upgrade)/i
    return addOnPattern.test(line) && line.length < 100
  }

  // Detect footnote-like text
  const isFootnoteText = (line: string): boolean => {
    const footnotePattern =
      /^(\*|†|note:|served with|all .* served|substitute|sub |prices? subject|consuming raw|ask (your |about))/i
    return footnotePattern.test(line) && line.length < 150
  }

  // ── Parse the text ──────────────────────────────────────

  let menuTitle = ''
  let menuSubtitle = ''
  let menuFooter = ''
  const sections: MenuSection[] = []
  let currentSection: MenuSection | null = null
  let lastItem: MenuItem | null = null
  let titleFound = false
  let subtitleFound = false

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]

    // First pass: detect menu title and subtitle
    if (!titleFound && isMenuTitle(line, i)) {
      menuTitle = line
      titleFound = true
      continue
    }

    if (titleFound && !subtitleFound && !currentSection && i < 6 && !isSectionHeader(line) && !priceRegex.test(line)) {
      // Likely the subtitle (address, phone, tagline)
      if (line.length > 5 && line.length < 120) {
        menuSubtitle = line
        subtitleFound = true
        continue
      }
    }

    // Check for section header
    if (isSectionHeader(line)) {
      // Save previous section
      if (currentSection && (currentSection.items.length > 0 || currentSection.title)) {
        sections.push(currentSection)
      }

      currentSection = {
        id: nanoid(),
        title: line.replace(/:$/, ''),
        subtitle: '',
        footnote: '',
        items: [],
      }
      lastItem = null

      // Check if the next line is a section subtitle
      if (i + 1 < rawLines.length) {
        const nextLine = rawLines[i + 1]
        if (isSubtitleText(nextLine)) {
          currentSection.subtitle = nextLine
          i++ // skip the subtitle line
        }
      }
      continue
    }

    // Check if this is a footnote at the end of a section
    if (currentSection && isFootnoteText(line)) {
      currentSection.footnote = currentSection.footnote
        ? currentSection.footnote + ' ' + line
        : line
      continue
    }

    // Try to parse as an item with price
    const parsed = parseItemLine(line)
    if (parsed) {
      // Create section if we don't have one
      if (!currentSection) {
        currentSection = {
          id: nanoid(),
          title: 'Menu Items',
          subtitle: '',
          footnote: '',
          items: [],
        }
      }

      const item: MenuItem = {
        id: nanoid(),
        name: parsed.name,
        description: '',
        price: parsed.price,
        priceLabel: parsed.priceLabel,
        tags: [],
        isAvailable: true,
      }

      currentSection.items.push(item)
      lastItem = item
      continue
    }

    // Check if a line is a standalone item name followed by a price on the next line
    if (
      i + 1 < rawLines.length &&
      !priceRegex.test(line) &&
      line.length > 2 &&
      line.length < 60
    ) {
      const nextLine = rawLines[i + 1]
      const nextParsed = parseItemLine(line + ' ' + nextLine)
      if (nextParsed && nextParsed.name === line.trim()) {
        if (!currentSection) {
          currentSection = {
            id: nanoid(),
            title: 'Menu Items',
            subtitle: '',
            footnote: '',
            items: [],
          }
        }

        const item: MenuItem = {
          id: nanoid(),
          name: nextParsed.name,
          description: '',
          price: nextParsed.price,
          priceLabel: nextParsed.priceLabel,
          tags: [],
          isAvailable: true,
        }

        currentSection.items.push(item)
        lastItem = item
        i++ // skip the price line
        continue
      }
    }

    // If we have a last item and this line is a description
    if (lastItem && line.length > 10 && !isSectionHeader(line)) {
      if (lastItem.description) {
        lastItem.description += ' ' + line
      } else {
        lastItem.description = line
      }
      continue
    }

    // Check if this is a footer-type line near the end
    if (i >= rawLines.length - 3 && !priceRegex.test(line) && line.length < 100) {
      menuFooter = menuFooter ? menuFooter + ' ' + line : line
    }
  }

  // Push the last section
  if (currentSection && (currentSection.items.length > 0 || currentSection.title)) {
    sections.push(currentSection)
  }

  // Fallback: if no sections found, create a default one
  if (sections.length === 0) {
    sections.push({
      id: nanoid(),
      title: 'Imported Menu',
      subtitle: '',
      footnote: '',
      items: [],
    })
  }

  // If no title was found, use a default
  if (!menuTitle) {
    menuTitle = 'Imported Menu'
  }

  return {
    title: menuTitle,
    subtitle: menuSubtitle,
    sections,
    footer: menuFooter,
  }
}
