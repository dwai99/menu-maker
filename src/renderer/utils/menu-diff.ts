import type { MenuData } from '../models/menu'

export interface MenuDiff {
  addedItems: Array<{ sectionTitle: string; itemName: string }>
  removedItems: Array<{ sectionTitle: string; itemName: string }>
  priceChanges: Array<{ sectionTitle: string; itemName: string; oldPrice: string; newPrice: string }>
  addedSections: string[]
  removedSections: string[]
}

export function computeMenuDiff(before: MenuData, after: MenuData): MenuDiff {
  const diff: MenuDiff = {
    addedItems: [],
    removedItems: [],
    priceChanges: [],
    addedSections: [],
    removedSections: [],
  }

  // Build lookup maps by section title
  const beforeSections = new Map(before.sections.map((s) => [s.title, s]))
  const afterSections = new Map(after.sections.map((s) => [s.title, s]))

  // Detect removed sections
  for (const [title] of beforeSections) {
    if (!afterSections.has(title)) {
      diff.removedSections.push(title)
    }
  }

  // Detect added sections
  for (const [title] of afterSections) {
    if (!beforeSections.has(title)) {
      diff.addedSections.push(title)
    }
  }

  // For sections that exist in both, diff items by name
  for (const [title, afterSection] of afterSections) {
    const beforeSection = beforeSections.get(title)
    if (!beforeSection) continue // added section — items are all "new" but we already noted the section

    const beforeItems = new Map(beforeSection.items.map((i) => [i.name, i]))
    const afterItems = new Map(afterSection.items.map((i) => [i.name, i]))

    // Removed items
    for (const [name] of beforeItems) {
      if (!afterItems.has(name)) {
        diff.removedItems.push({ sectionTitle: title, itemName: name })
      }
    }

    // Added items + price changes
    for (const [name, afterItem] of afterItems) {
      const beforeItem = beforeItems.get(name)
      if (!beforeItem) {
        diff.addedItems.push({ sectionTitle: title, itemName: name })
      } else if (beforeItem.price !== afterItem.price) {
        diff.priceChanges.push({
          sectionTitle: title,
          itemName: name,
          oldPrice: beforeItem.price,
          newPrice: afterItem.price,
        })
      }
    }
  }

  return diff
}

export function isDiffEmpty(diff: MenuDiff): boolean {
  return (
    diff.addedItems.length === 0 &&
    diff.removedItems.length === 0 &&
    diff.priceChanges.length === 0 &&
    diff.addedSections.length === 0 &&
    diff.removedSections.length === 0
  )
}
