import { describe, it, expect } from 'vitest'
import {
    createMenuItem,
    createMenuSection,
    createDefaultMenuData,
    DIETARY_ICON_META,
} from '../menu'
import type { DietaryIcon } from '../menu'

describe('Menu Models', () => {
    // ── createMenuItem ────────────────────────────────────────
    describe('createMenuItem', () => {
        it('should create item with unique ID', () => {
            const item1 = createMenuItem()
            const item2 = createMenuItem()
            expect(item1.id).toBeTruthy()
            expect(item2.id).toBeTruthy()
            expect(item1.id).not.toBe(item2.id)
        })

        it('should have empty default values', () => {
            const item = createMenuItem()
            expect(item.name).toBe('')
            expect(item.description).toBe('')
            expect(item.price).toBe('')
            expect(item.priceLabel).toBe('')
            expect(item.tags).toEqual([])
            expect(item.isAvailable).toBe(true)
        })

        it('should not have dietary icons by default', () => {
            const item = createMenuItem()
            expect(item.dietaryIcons).toBeUndefined()
        })
    })

    // ── createMenuSection ─────────────────────────────────────
    describe('createMenuSection', () => {
        it('should create section with unique ID', () => {
            const sec1 = createMenuSection()
            const sec2 = createMenuSection()
            expect(sec1.id).toBeTruthy()
            expect(sec1.id).not.toBe(sec2.id)
        })

        it('should have empty defaults', () => {
            const section = createMenuSection()
            expect(section.title).toBe('')
            expect(section.subtitle).toBe('')
            expect(section.items).toEqual([])
            expect(section.footnote).toBe('')
        })

        it('should not have color override by default', () => {
            const section = createMenuSection()
            expect(section.colorOverride).toBeUndefined()
        })
    })

    // ── createDefaultMenuData ─────────────────────────────────
    describe('createDefaultMenuData', () => {
        it('should have a non-empty title', () => {
            const menu = createDefaultMenuData()
            expect(menu.title).toBeTruthy()
            expect(menu.title.length).toBeGreaterThan(0)
        })

        it('should have 4 sections', () => {
            const menu = createDefaultMenuData()
            expect(menu.sections).toHaveLength(4)
        })

        it('should have sections with items', () => {
            const menu = createDefaultMenuData()
            for (const section of menu.sections) {
                expect(section.items.length).toBeGreaterThan(0)
                expect(section.title).toBeTruthy()
            }
        })

        it('should have an empty footer by default', () => {
            const menu = createDefaultMenuData()
            expect(menu.footer).toBe('')
        })

        it('should not have a logo by default', () => {
            const menu = createDefaultMenuData()
            expect(menu.logo).toBeUndefined()
        })

        it('should have unique IDs for all sections and items', () => {
            const menu = createDefaultMenuData()
            const allIds = new Set<string>()
            for (const section of menu.sections) {
                expect(allIds.has(section.id)).toBe(false)
                allIds.add(section.id)
                for (const item of section.items) {
                    expect(allIds.has(item.id)).toBe(false)
                    allIds.add(item.id)
                }
            }
        })

        it('should set all items as available', () => {
            const menu = createDefaultMenuData()
            for (const section of menu.sections) {
                for (const item of section.items) {
                    expect(item.isAvailable).toBe(true)
                }
            }
        })
    })

    // ── DIETARY_ICON_META ─────────────────────────────────────
    describe('DIETARY_ICON_META', () => {
        const icons: DietaryIcon[] = ['v', 'vg', 'gf', 'df', 'nuts', 'spicy']

        it('should have metadata for all dietary icons', () => {
            for (const icon of icons) {
                expect(DIETARY_ICON_META[icon]).toBeDefined()
                expect(DIETARY_ICON_META[icon].label).toBeTruthy()
                expect(DIETARY_ICON_META[icon].abbr).toBeTruthy()
                expect(DIETARY_ICON_META[icon].color).toBeTruthy()
            }
        })

        it('should have unique abbreviations', () => {
            const abbrs = icons.map((i) => DIETARY_ICON_META[i].abbr)
            expect(new Set(abbrs).size).toBe(abbrs.length)
        })

        it('should have valid hex colors', () => {
            for (const icon of icons) {
                expect(DIETARY_ICON_META[icon].color).toMatch(/^#[0-9a-fA-F]{6}$/)
            }
        })
    })
})
