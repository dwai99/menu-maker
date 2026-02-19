import type { MenuSection } from '../models/menu'

/**
 * Keyword-based section ordering for semantic menu layout.
 * Maps common menu section names to a sort priority so that
 * appetizers appear first, mains in the middle, desserts/drinks last.
 */

const PRIORITY_KEYWORDS: [number, RegExp][] = [
  [0, /\b(appetizer|starter|happy\s*hour|snack)\b/i],
  [0, /\bapps?\b/i],  // standalone "app" or "apps"
  [1, /\b(soup|chowder)\b/i],
  [2, /\b(salad|greens)\b/i],
  [3, /\b(entree|entrée|main|handheld|sandwich|burger|taco|wrap|pizza)\b/i],
  [4, /\b(pasta|noodle|rice|side)\b/i],
  [5, /\b(dessert|sweet|cake|pie|pastry)\b/i],
  [6, /\b(drink|beverage|cocktail|wine|beer|spirit|coffee|tea)\b/i],
]

const DEFAULT_PRIORITY = 3.5

export function sectionSortKey(title: string): number {
  for (const [priority, pattern] of PRIORITY_KEYWORDS) {
    if (pattern.test(title)) return priority
  }
  return DEFAULT_PRIORITY
}

/**
 * Returns a new array of sections sorted by menu priority.
 * Stable sort preserves original order within the same priority.
 */
export function sortSections<T extends { title: string }>(sections: T[]): T[] {
  return [...sections].sort((a, b) => sectionSortKey(a.title) - sectionSortKey(b.title))
}
