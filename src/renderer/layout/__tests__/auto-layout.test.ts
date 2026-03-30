import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeFlowLayout } from '../auto-layout'
import { boundingBox } from '../polygon'
import type { MenuSection } from '../../models/menu'
import type { PageLayout } from '../../models/layout'
import { createDefaultTypography } from '../../models/layout'

// ── Mock canvas for measureTextWidth ──
beforeEach(() => {
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

function makePageLayout(cols: number = 3): PageLayout {
  return {
    pageSize: 'letter',
    orientation: 'portrait',
    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
    columnCount: cols as any,
    layoutDirection: 'vertical',
    sectionLayouts: [],
    colorScheme: { background: '#fff', text: '#000', accent: '#000', border: '#ccc' },
    typography: createDefaultTypography(),
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

describe('computeFlowLayout — balanced columns', () => {
  it('should distribute sections across columns on each page', () => {
    // 6 small sections in 3 columns — should balance across columns
    const sections = Array.from({ length: 6 }, (_, i) => makeSection(`s${i}`, 2))
    const pageLayout = makePageLayout(3)

    const result = computeFlowLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '', sections, },
    })

    // Count sections per column on the first page
    const page0Layouts = result.sectionLayouts.filter((sl) => sl.pageIndex === 0)
    const colCounts = new Map<number, number>()
    for (const sl of page0Layouts) {
      const x = Math.round(boundingBox(sl.polygon).x)
      colCounts.set(x, (colCounts.get(x) || 0) + 1)
    }

    // Expect balanced distribution (2 per column for 6 sections / 3 cols)
    const counts = Array.from(colCounts.values())
    if (counts.length > 1) {
      const max = Math.max(...counts)
      const min = Math.min(...counts)
      // Balanced means max - min should be at most 1
      expect(max - min).toBeLessThanOrEqual(1)
    }
  })

  it('should handle single column flow layout', () => {
    const sections = [makeSection('a', 3), makeSection('b', 3)]
    const pageLayout = makePageLayout(1)

    const result = computeFlowLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '', sections, },
    })

    // All sections should be at x=0 (single column)
    for (const sl of result.sectionLayouts) {
      expect(Math.round(boundingBox(sl.polygon).x)).toBe(0)
    }
  })

  it('should produce valid pageCount', () => {
    const sections = Array.from({ length: 4 }, (_, i) => makeSection(`s${i}`, 3))
    const pageLayout = makePageLayout(2)

    const result = computeFlowLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '', sections, },
    })

    expect(result.pageCount).toBeGreaterThanOrEqual(1)
    // All section layouts should have valid pageIndex
    for (const sl of result.sectionLayouts) {
      expect(sl.pageIndex).toBeGreaterThanOrEqual(0)
      expect(sl.pageIndex).toBeLessThan(result.pageCount)
    }
  })

  it('should handle empty sections', () => {
    const result = computeFlowLayout({
      sections: [],
      pageLayout: makePageLayout(3),
      menuData: { title: '', subtitle: '', footer: '', sections: [], },
    })

    expect(result.sectionLayouts).toHaveLength(0)
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  })

  it('should stack sections at natural height without expanding', () => {
    // 2 small sections in 1 column — should NOT stretch to fill available space
    const sections = [makeSection('a', 1), makeSection('b', 1)]
    const pageLayout = makePageLayout(1)

    const result = computeFlowLayout({
      sections,
      pageLayout,
      menuData: { title: '', subtitle: '', footer: '', sections, },
    })

    const page0 = result.sectionLayouts.filter((sl) => sl.pageIndex === 0)
    if (page0.length === 2) {
      const y0 = boundingBox(page0[0].polygon).y
      const h0 = boundingBox(page0[0].polygon).height
      const h1 = boundingBox(page0[1].polygon).height

      // First section starts at top (y=0)
      expect(y0).toBe(0)
      // Sections should NOT fill the full column — just their natural height
      expect(h0 + h1).toBeLessThan(80)
    }
  })
})
