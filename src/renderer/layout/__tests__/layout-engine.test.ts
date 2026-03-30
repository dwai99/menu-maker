import { describe, it, expect } from 'vitest'
import {
  getFragmentId,
  parseFragmentId,
  findFragment,
  findFragmentIndex,
  removeFragment,
  mergeFragments,
  reflowColumn,
} from '../layout-engine'
import type { SectionLayout } from '../../models/layout'
import { rectToPolygon, boundingBox } from '../polygon'

const makeLayout = (
  sectionId: string,
  startItemIndex?: number,
  endItemIndex?: number,
): SectionLayout => ({
  sectionId,
  polygon: [[0, 0], [50, 0], [50, 50], [0, 50]],
  columnCount: 1,
  pageIndex: 0,
  startItemIndex,
  endItemIndex,
})

describe('layout-engine', () => {
  // ── Fragment Identity ────────────────────────────────────────────

  describe('getFragmentId / parseFragmentId', () => {
    it('should produce "sectionId:0" for a layout without startItemIndex', () => {
      const layout = makeLayout('sec-1')
      expect(getFragmentId(layout)).toBe('sec-1:0')
    })

    it('should produce "sectionId:N" for a layout with startItemIndex', () => {
      const layout = makeLayout('sec-1', 5)
      expect(getFragmentId(layout)).toBe('sec-1:5')
    })

    it('should round-trip correctly', () => {
      const layout = makeLayout('sec-abc', 12)
      const id = getFragmentId(layout)
      const parsed = parseFragmentId(id)
      expect(parsed.sectionId).toBe('sec-abc')
      expect(parsed.startItemIndex).toBe(12)
    })

    it('should round-trip for startItemIndex 0', () => {
      const layout = makeLayout('my-section')
      const id = getFragmentId(layout)
      const parsed = parseFragmentId(id)
      expect(parsed.sectionId).toBe('my-section')
      expect(parsed.startItemIndex).toBe(0)
    })

    it('should handle sectionId containing colons', () => {
      const layout: SectionLayout = {
        sectionId: 'ns:sec-1',
        polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
        columnCount: 1,
        pageIndex: 0,
        startItemIndex: 3,
      }
      const id = getFragmentId(layout)
      expect(id).toBe('ns:sec-1:3')
      const parsed = parseFragmentId(id)
      expect(parsed.sectionId).toBe('ns:sec-1')
      expect(parsed.startItemIndex).toBe(3)
    })

    it('should parse a plain sectionId without colon as startItemIndex 0', () => {
      const parsed = parseFragmentId('simple')
      expect(parsed.sectionId).toBe('simple')
      expect(parsed.startItemIndex).toBe(0)
    })
  })

  // ── Fragment Lookup ──────────────────────────────────────────────

  describe('findFragment / findFragmentIndex', () => {
    const layouts: SectionLayout[] = [
      makeLayout('sec-1'),
      makeLayout('sec-1', 5, 10),
      makeLayout('sec-2'),
      makeLayout('sec-1', 10),
    ]

    it('should find the first fragment of sec-1', () => {
      const frag = findFragment('sec-1:0', layouts)
      expect(frag).toBeDefined()
      expect(frag!.sectionId).toBe('sec-1')
      expect(frag!.startItemIndex).toBeUndefined()
    })

    it('should find a continuation fragment of sec-1', () => {
      const frag = findFragment('sec-1:5', layouts)
      expect(frag).toBeDefined()
      expect(frag!.startItemIndex).toBe(5)
      expect(frag!.endItemIndex).toBe(10)
    })

    it('should find the third continuation', () => {
      const frag = findFragment('sec-1:10', layouts)
      expect(frag).toBeDefined()
      expect(frag!.startItemIndex).toBe(10)
    })

    it('should return undefined for missing fragment', () => {
      expect(findFragment('sec-3:0', layouts)).toBeUndefined()
    })

    it('should return correct index', () => {
      expect(findFragmentIndex('sec-1:0', layouts)).toBe(0)
      expect(findFragmentIndex('sec-1:5', layouts)).toBe(1)
      expect(findFragmentIndex('sec-2:0', layouts)).toBe(2)
      expect(findFragmentIndex('sec-1:10', layouts)).toBe(3)
    })

    it('should return -1 for missing fragment index', () => {
      expect(findFragmentIndex('sec-99:0', layouts)).toBe(-1)
    })
  })

  // ── removeFragment ───────────────────────────────────────────────

  describe('removeFragment', () => {
    it('should remove only the matching fragment', () => {
      const layouts: SectionLayout[] = [
        makeLayout('sec-1'),
        makeLayout('sec-1', 5),
        makeLayout('sec-2'),
      ]
      const result = removeFragment('sec-1:5', layouts)
      expect(result).toHaveLength(2)
      expect(result[0].sectionId).toBe('sec-1')
      expect(result[0].startItemIndex).toBeUndefined()
      expect(result[1].sectionId).toBe('sec-2')
    })

    it('should return same array if fragment not found', () => {
      const layouts: SectionLayout[] = [makeLayout('sec-1')]
      const result = removeFragment('sec-99:0', layouts)
      expect(result).toHaveLength(1)
    })
  })

  // ── mergeFragments ───────────────────────────────────────────────

  describe('mergeFragments', () => {
    it('should merge split fragments into one', () => {
      const layouts: SectionLayout[] = [
        makeLayout('sec-1', 0, 5),
        makeLayout('sec-2'),
        makeLayout('sec-1', 5),
      ]
      const result = mergeFragments('sec-1', layouts)
      expect(result).toHaveLength(2)

      const merged = result.find((sl) => sl.sectionId === 'sec-1')!
      expect(merged.startItemIndex).toBeUndefined()
      expect(merged.endItemIndex).toBeUndefined()

      // sec-2 should be preserved
      expect(result.find((sl) => sl.sectionId === 'sec-2')).toBeDefined()
    })

    it('should be a no-op when section has only one fragment', () => {
      const layouts: SectionLayout[] = [makeLayout('sec-1'), makeLayout('sec-2')]
      const result = mergeFragments('sec-1', layouts)
      expect(result).toHaveLength(2)
      expect(result).toEqual(layouts)
    })

    it('should preserve order of other sections', () => {
      const layouts: SectionLayout[] = [
        makeLayout('sec-1', 0, 3),
        makeLayout('sec-2'),
        makeLayout('sec-3'),
        makeLayout('sec-1', 3),
      ]
      const result = mergeFragments('sec-1', layouts)
      expect(result).toHaveLength(3)
      expect(result[0].sectionId).toBe('sec-1')
      expect(result[1].sectionId).toBe('sec-2')
      expect(result[2].sectionId).toBe('sec-3')
    })
  })

  // ── reflowColumn ────────────────────────────────────────────────

  describe('reflowColumn', () => {
    const makeColLayout = (
      sectionId: string,
      x: number, y: number, w: number, h: number,
      startItemIndex?: number,
    ): SectionLayout => ({
      sectionId,
      polygon: rectToPolygon(x, y, w, h),
      columnCount: 1,
      pageIndex: 0,
      startItemIndex,
    })

    it('should restack fragments in the same column after resize', () => {
      // Split section sec-1: 3 fragments stacked in one column
      // Fragment 0 at y=0 h=60 (was 40, resized to 60)
      // Fragment 5 at y=42 h=30 (continuation, still at old position)
      // Fragment 10 at y=74 h=20 (continuation, still at old position)
      const layouts: SectionLayout[] = [
        makeColLayout('sec-1', 0, 0, 50, 60, 0),     // resized from 40→60
        makeColLayout('sec-1', 0, 42, 50, 30, 5),    // continuation at old position
        makeColLayout('sec-1', 0, 74, 50, 20, 10),   // continuation at old position
      ]
      const result = reflowColumn('sec-1:0', layouts)

      const frag0 = result.find(sl => (sl.startItemIndex ?? 0) === 0)!
      const frag5 = result.find(sl => (sl.startItemIndex ?? 0) === 5)!
      const frag10 = result.find(sl => (sl.startItemIndex ?? 0) === 10)!

      // Fragment 0 stays at y=0
      expect(boundingBox(frag0.polygon).y).toBe(0)
      // Fragment 5 should be at frag0 bottom + gap (60 + 1 = 61)
      expect(boundingBox(frag5.polygon).y).toBe(61)
      // Fragment 10 should be at frag5 bottom + gap (61 + 30 + 1 = 92)
      expect(boundingBox(frag10.polygon).y).toBe(92)
    })

    it('should not move unrelated sections in the same column', () => {
      // sec-1 and sec-2 both at x=0, full width — freeform mode
      // Resizing sec-1 should NOT move sec-2
      const layouts: SectionLayout[] = [
        makeColLayout('sec-1', 0, 0, 100, 60),
        makeColLayout('sec-2', 0, 42, 100, 30),
      ]
      const result = reflowColumn('sec-1:0', layouts)

      // sec-2 stays at its original position
      const sec2 = result.find(sl => sl.sectionId === 'sec-2')!
      expect(boundingBox(sec2.polygon).y).toBe(42)
    })

    it('should not move fragments in a different column', () => {
      // sec-1 split: fragment 0 in column 1, fragment 5 in column 2
      const layouts: SectionLayout[] = [
        makeColLayout('sec-1', 0, 0, 48, 60, 0),    // column 1
        makeColLayout('sec-1', 52, 0, 48, 50, 5),   // column 2 (different x)
      ]
      const result = reflowColumn('sec-1:0', layouts)

      // fragment 5 in column 2 should not move
      const frag5 = result.find(sl => (sl.startItemIndex ?? 0) === 5)!
      expect(boundingBox(frag5.polygon).y).toBe(0)
    })

    it('should be a no-op for a single fragment in a column', () => {
      const layouts: SectionLayout[] = [
        makeColLayout('sec-1', 0, 10, 50, 40),
      ]
      const result = reflowColumn('sec-1:0', layouts)
      expect(result).toEqual(layouts)
    })
  })
})
