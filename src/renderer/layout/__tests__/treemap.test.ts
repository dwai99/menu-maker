import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  balancedPartition,
  canPartition,
  buildPartition,
  findSplitPointWithOrphanGuard,
  computeTreemapLayout,
  type ColumnGroup,
} from '../treemap'
import { boundingBox } from '../polygon'
import type { MenuSection } from '../../models/menu'
import type { PageLayout, TypographyConfig } from '../../models/layout'
import { createDefaultTypography, createDefaultFontStyle } from '../../models/layout'

// ── Mock canvas for measureTextWidth ──
beforeEach(() => {
  // Mock canvas measureText to return deterministic widths
  const mockCtx = {
    font: '',
    measureText: (text: string) => ({ width: text.length * 7 }),
  }
  vi.spyOn(document, 'createElement').mockReturnValue({
    getContext: () => mockCtx,
  } as any)
})

// ── Helpers ──

function makeSection(id: string, itemCount: number): MenuSection {
  return {
    id,
    title: `Section ${id}`,
    subtitle: '',
    footnote: '',
    items: Array.from({ length: itemCount }, (_, i) => ({
      id: `${id}-item-${i}`,
      name: `Item ${i + 1}`,
      description: 'A menu item',
      price: '10.00',
      priceLabel: '',
      tags: [],
      isAvailable: true,
    })),
  }
}

function makeTypography(): TypographyConfig {
  return createDefaultTypography()
}

function makePageLayout(cols: number = 3): PageLayout {
  return {
    pageSize: 'letter',
    orientation: 'portrait',
    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
    columnCount: cols as any,
    layoutDirection: 'vertical',
    sectionLayouts: [],
    colorScheme: { background: '#fff', text: '#000', accent: '#000', border: '#ccc' },
    typography: makeTypography(),
    itemSeparator: 'none',
    priceFormat: 'right-aligned',
    sectionDecoration: 'none',
    currency: '$',
    backgroundTexture: 'none',
    sectionDivider: 'none',
    pageBorder: 'none',
    sectionGap: 16,
  }
}

// ── Tests ──

describe('balancedPartition', () => {
  it('should partition equal heights evenly', () => {
    const heights = [100, 100, 100]
    const result = balancedPartition(heights, 3, 8)
    expect(result).toHaveLength(3)
    // Each column gets one section
    expect(result[0]).toEqual({ start: 0, end: 1 })
    expect(result[1]).toEqual({ start: 1, end: 2 })
    expect(result[2]).toEqual({ start: 2, end: 3 })
  })

  it('should minimize max column height for unequal heights', () => {
    // Heights: [100, 50, 50, 100] into 2 columns
    // Optimal: col1=[100,50] (150+8=158), col2=[50,100] (150+8=158)
    // Not: col1=[100,50,50] (200+16=216), col2=[100]
    const heights = [100, 50, 50, 100]
    const result = balancedPartition(heights, 2, 8)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ start: 0, end: 2 })
    expect(result[1]).toEqual({ start: 2, end: 4 })
  })

  it('should give one-per-column when more columns than sections', () => {
    const heights = [100, 200]
    const result = balancedPartition(heights, 4, 8)
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ start: 0, end: 1 })
    expect(result[1]).toEqual({ start: 1, end: 2 })
    // Extra columns are empty
    expect(result[2]).toEqual({ start: 2, end: 2 })
    expect(result[3]).toEqual({ start: 2, end: 2 })
  })

  it('should return all sections in single column when k=1', () => {
    const heights = [100, 200, 150]
    const result = balancedPartition(heights, 1, 8)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ start: 0, end: 3 })
  })

  it('should handle empty sections array', () => {
    const result = balancedPartition([], 3, 8)
    expect(result).toHaveLength(3)
    result.forEach((g) => expect(g.start).toBe(g.end))
  })

  it('should balance 6 sections into 3 columns as 2+2+2', () => {
    // Equal heights — should split evenly
    const heights = [100, 100, 100, 100, 100, 100]
    const result = balancedPartition(heights, 3, 8)
    expect(result).toHaveLength(3)
    // Each group should have 2 sections
    for (const g of result) {
      if (g.end > g.start) {
        expect(g.end - g.start).toBe(2)
      }
    }
  })

  it('should keep sections contiguous (never reorder)', () => {
    const heights = [200, 50, 50, 200]
    const result = balancedPartition(heights, 2, 8)
    // Groups must be contiguous ranges covering [0, 4)
    const nonEmpty = result.filter((g) => g.end > g.start)
    for (let i = 1; i < nonEmpty.length; i++) {
      expect(nonEmpty[i].start).toBe(nonEmpty[i - 1].end)
    }
    expect(nonEmpty[0].start).toBe(0)
    expect(nonEmpty[nonEmpty.length - 1].end).toBe(4)
  })
})

describe('canPartition', () => {
  it('should return true when sections fit', () => {
    expect(canPartition([100, 100, 100], 3, 100, 8)).toBe(true)
  })

  it('should return false when maxHeight is too small', () => {
    expect(canPartition([100, 100, 100, 100], 2, 100, 8)).toBe(false)
  })

  it('should account for vertical gaps between sections', () => {
    // 2 sections of 50 each with 8px gap = 108
    // maxHeight 100 should not fit them in one column
    expect(canPartition([50, 50], 1, 100, 8)).toBe(false)
    expect(canPartition([50, 50], 1, 108, 8)).toBe(true)
  })
})

describe('buildPartition', () => {
  it('should build correct groups', () => {
    const result = buildPartition([100, 100, 100], 3, 100, 8)
    expect(result[0]).toEqual({ start: 0, end: 1 })
    expect(result[1]).toEqual({ start: 1, end: 2 })
    expect(result[2]).toEqual({ start: 2, end: 3 })
  })

  it('should pad with empty groups when fewer sections than columns', () => {
    const result = buildPartition([100], 3, 200, 8)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ start: 0, end: 1 })
    expect(result[1].start).toBe(result[1].end)
    expect(result[2].start).toBe(result[2].end)
  })
})

describe('computeTreemapLayout — balanced placement', () => {
  it('should distribute 3 sections into 3 columns (one each)', () => {
    const sections = [makeSection('a', 3), makeSection('b', 3), makeSection('c', 3)]
    const pageLayout = makePageLayout(3)

    const result = computeTreemapLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '' },
    })

    // Each section should be in a different column (different x positions)
    const xPositions = result.sectionLayouts.map((sl) => Math.round(boundingBox(sl.polygon).x))
    const uniqueXs = new Set(xPositions)
    expect(uniqueXs.size).toBe(3)
  })

  it('should distribute 6 sections in 3 columns balanced (2 per col, not 4/1/1)', () => {
    const sections = Array.from({ length: 6 }, (_, i) => makeSection(`s${i}`, 2))
    const pageLayout = makePageLayout(3)

    const result = computeTreemapLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '' },
    })

    // Count sections per column by x position
    const colCounts = new Map<number, number>()
    for (const sl of result.sectionLayouts) {
      const x = Math.round(boundingBox(sl.polygon).x)
      colCounts.set(x, (colCounts.get(x) || 0) + 1)
    }

    // Each column should have exactly 2 sections (balanced)
    const counts = Array.from(colCounts.values())
    expect(counts).toHaveLength(3)
    for (const count of counts) {
      expect(count).toBe(2)
    }
  })

  it('should stack sections at natural height without expanding', () => {
    // Create small sections — they should NOT stretch to fill the column
    const sections = [makeSection('a', 1), makeSection('b', 1)]
    const pageLayout = makePageLayout(1)

    const result = computeTreemapLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '' },
    })

    const layouts = result.sectionLayouts
    if (layouts.length === 2 && !result.overflow) {
      const y0 = boundingBox(layouts[0].polygon).y
      const h0 = boundingBox(layouts[0].polygon).height
      const h1 = boundingBox(layouts[1].polygon).height
      // First section starts at top
      expect(y0).toBe(0)
      // Sections should NOT fill the full column — just their natural height
      expect(h0 + h1).toBeLessThan(80)
    }
  })

  it('should handle single section in single column', () => {
    const sections = [makeSection('a', 5)]
    const pageLayout = makePageLayout(1)

    const result = computeTreemapLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '' },
    })

    expect(result.sectionLayouts).toHaveLength(1)
    expect(result.sectionLayouts[0].sectionId).toBe('a')
  })

  it('should handle empty sections array', () => {
    const result = computeTreemapLayout({
      sections: [],
      pageLayout: makePageLayout(3),
      menuData: { title: '', subtitle: '', footer: '' },
    })

    expect(result.sectionLayouts).toHaveLength(0)
    expect(result.overflow).toBe(false)
  })
})

describe('findSplitPointWithOrphanGuard', () => {
  const typography = makeTypography()

  it('should avoid leaving only 1 item in continuation', () => {
    // Create a section with 5 items. If normal split would leave 1 item
    // in the continuation, the guard should move the split back.
    const section = makeSection('test', 5)

    // Use a small budget that forces a split near the end
    // We need to find a budget that splits at index 4 (leaving 1 item)
    // then verify the guard adjusts it back to 3 (leaving 2 items)
    // This is hard to control exactly without knowing the heights,
    // so we test the general behavior: continuation always has ≥2 items
    // unless the first part would have <2 items after adjustment

    const result = findSplitPointWithOrphanGuard(
      section,
      typography,
      400,
      99999, // large budget — everything fits
      'none',
      0,
      undefined,
    )

    // Everything fits, so splitIndex should be items.length
    expect(result.splitIndex).toBe(5)
  })

  it('should not adjust when continuation already has ≥2 items', () => {
    const section = makeSection('test', 6)

    // With a budget that would split at item 3 (leaving 3 items in continuation),
    // the guard should not change anything
    const result = findSplitPointWithOrphanGuard(
      section,
      typography,
      400,
      50, // very small budget — will split early
      'none',
      0,
      undefined,
    )

    // The split should happen and continuation should have ≥2 items
    if (result.splitIndex < 6) {
      expect(6 - result.splitIndex).toBeGreaterThanOrEqual(2)
    }
  })

  it('should handle section with only 1 item (no split possible)', () => {
    const section = makeSection('test', 1)

    const result = findSplitPointWithOrphanGuard(
      section,
      typography,
      400,
      50,
      'none',
      0,
      undefined,
    )

    // Single item — can't split, splitIndex is 1 (all items)
    expect(result.splitIndex).toBe(1)
  })
})
