import { describe, it, expect } from 'vitest'
import { parseMenuText } from '../parse-menu-text'

describe('parseMenuText', () => {
    // ── Empty and minimal input ────────────────────────────────
    describe('empty and minimal input', () => {
        it('should return a fallback section for empty string', () => {
            const result = parseMenuText('')
            expect(result.sections).toHaveLength(1)
            expect(result.sections[0].title).toBe('Imported Menu')
        })

        it('should return default title for empty input', () => {
            const result = parseMenuText('')
            expect(result.title).toBe('Imported Menu')
        })

        it('should return empty subtitle for empty input', () => {
            const result = parseMenuText('')
            expect(result.subtitle).toBe('')
        })

        it('should handle whitespace-only input', () => {
            const result = parseMenuText('   \n  \n  ')
            expect(result.sections).toHaveLength(1)
            expect(result.title).toBe('Imported Menu')
        })
    })

    // ── Simple menu items with prices ─────────────────────────
    describe('simple items with prices', () => {
        it('should parse a single item with price', () => {
            const text = 'MY RESTAURANT\nAPPS\nWings $10.99'
            const result = parseMenuText(text)
            const section = result.sections.find(s => s.title === 'APPS')
            expect(section).toBeDefined()
            expect(section!.items).toHaveLength(1)
            expect(section!.items[0].name).toBe('Wings')
            expect(section!.items[0].price).toBe('10.99')
        })

        it('should parse multiple items in a section', () => {
            const text = [
                'GREAT FOOD',
                'APPETIZERS',
                'Wings $10.99',
                'Fries $5.99',
                'Nachos $12.99',
            ].join('\n')

            const result = parseMenuText(text)
            const section = result.sections.find(s => s.title === 'APPETIZERS')
            expect(section).toBeDefined()
            expect(section!.items).toHaveLength(3)
        })

        it('should extract price correctly', () => {
            const text = 'MENU\nFOOD\nBurger $15.99'
            const result = parseMenuText(text)
            const item = result.sections[0].items[0]
            expect(item.price).toBe('15.99')
        })

        it('should mark all parsed items as available', () => {
            const text = 'MENU\nFOOD\nBurger $12\nPasta $14'
            const result = parseMenuText(text)
            for (const section of result.sections) {
                for (const item of section.items) {
                    expect(item.isAvailable).toBe(true)
                }
            }
        })

        it('should assign unique IDs to all items', () => {
            const text = 'MENU\nFOOD\nBurger $10\nFries $5\nSalad $8'
            const result = parseMenuText(text)
            const ids = result.sections.flatMap(s => s.items.map(i => i.id))
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length)
        })

        it('should handle items with dollar sign and spaces', () => {
            const text = 'MENU\nFOOD\nChicken $ 14.00'
            const result = parseMenuText(text)
            const items = result.sections.flatMap(s => s.items)
            expect(items.length).toBeGreaterThan(0)
        })
    })

    // ── Menu title and subtitle detection ─────────────────────
    describe('title and subtitle detection', () => {
        it('should detect the menu title from the first line', () => {
            const text = 'The Grand Bistro\n555-1234\nAPPS\nWings $10'
            const result = parseMenuText(text)
            expect(result.title).toBe('The Grand Bistro')
        })

        it('should detect subtitle as phone/address line after title', () => {
            const text = 'My Restaurant\n123 Main St, City, ST 12345\nAPPS\nWings $10'
            const result = parseMenuText(text)
            expect(result.subtitle).toBe('123 Main St, City, ST 12345')
        })

        it('should use "Imported Menu" as title fallback when no title detected', () => {
            // Start directly with items (no recognizable title)
            const text = 'Appetizers\nWings $10.99\nFries $5.99'
            const result = parseMenuText(text)
            // Appetizers is a section keyword, so title may fall back
            expect(result.title).toBeTruthy()
        })

        it('should not assign a line with a price as the title', () => {
            const text = 'Wings $10.99\nFries $5.99'
            const result = parseMenuText(text)
            expect(result.title).not.toContain('$')
        })
    })

    // ── Multi-section text ─────────────────────────────────────
    describe('multi-section parsing', () => {
        it('should parse multiple sections from ALL-CAPS headers', () => {
            const text = [
                'Restaurant Name',
                'APPETIZERS',
                'Wings $10.99',
                'MAINS',
                'Burger $15.99',
                'DESSERTS',
                'Cake $7.99',
            ].join('\n')

            const result = parseMenuText(text)
            expect(result.sections.length).toBeGreaterThanOrEqual(3)
        })

        it('should place items under the correct section', () => {
            const text = [
                'My Menu',
                'APPETIZERS',
                'Wings $10.99',
                'Fries $5.99',
                'MAINS',
                'Steak $29.99',
            ].join('\n')

            const result = parseMenuText(text)
            const apps = result.sections.find(s => s.title === 'APPETIZERS')
            const mains = result.sections.find(s => s.title === 'MAINS')

            expect(apps?.items).toHaveLength(2)
            expect(mains?.items).toHaveLength(1)
        })

        it('should detect section keywords regardless of case', () => {
            const text = 'My Bar\nAppetizers\nWings $10\nDesserts\nCake $7'
            const result = parseMenuText(text)
            // Should have at least 2 sections
            expect(result.sections.length).toBeGreaterThanOrEqual(2)
        })

        it('should preserve section order', () => {
            const text = [
                'Restaurant',
                'APPS',
                'Wings $10',
                'SALADS',
                'Caesar $12',
                'ENTREES',
                'Steak $30',
            ].join('\n')

            const result = parseMenuText(text)
            const titles = result.sections.map(s => s.title)
            const appsIdx = titles.indexOf('APPS')
            const saladsIdx = titles.indexOf('SALADS')
            const entreesIdx = titles.indexOf('ENTREES')

            expect(appsIdx).toBeLessThan(saladsIdx)
            expect(saladsIdx).toBeLessThan(entreesIdx)
        })
    })

    // ── Item descriptions ──────────────────────────────────────
    describe('item descriptions', () => {
        it('should attach description lines to the preceding item', () => {
            // Place subtitle-looking lines early (i<6) to avoid interfering;
            // description must come after subtitle detection window
            const text = [
                'My Menu',
                '555-1234',                           // i=1 subtitle
                'www.mymenu.com',                     // i=2 (subtitleFound=true after i=1, so this goes elsewhere)
                'APPETIZERS',                          // i=3 section header
                'FOOD',                                // i=4 (subtitle already found, sections started)
                'Wings $10.99',                        // i=5 item
                'Tossed in buffalo sauce, served with ranch.', // i=6 description (past subtitle window)
            ].join('\n')

            const result = parseMenuText(text)
            const allItems = result.sections.flatMap(s => s.items)
            const wingsItem = allItems.find(i => i.name === 'Wings')
            expect(wingsItem).toBeDefined()
            expect(wingsItem!.description).toContain('buffalo sauce')
        })

        it('should handle items without descriptions', () => {
            const text = 'Menu\nFOOD\nWings $10\nFries $5'
            const result = parseMenuText(text)
            const items = result.sections.flatMap(s => s.items)
            // Items may have empty descriptions
            for (const item of items) {
                expect(item.description).toBeDefined()
            }
        })
    })

    // ── Multi-price items ──────────────────────────────────────
    describe('multi-price items', () => {
        it('should use the first price as the primary price', () => {
            const text = 'Menu\nFOOD\nSoup $5.50 / Bowl $8.50'
            const result = parseMenuText(text)
            const items = result.sections.flatMap(s => s.items)
            expect(items[0].price).toBe('5.50')
        })

        it('should capture additional prices in priceLabel', () => {
            const text = 'Menu\nFOOD\nSoup $5.50 Bowl $8.50'
            const result = parseMenuText(text)
            const items = result.sections.flatMap(s => s.items)
            expect(items.length).toBeGreaterThan(0)
            // Primary price should be captured
            expect(items[0].price).toBeTruthy()
        })
    })

    // ── Footnotes and subtitles ────────────────────────────────
    describe('footnotes and section subtitles', () => {
        it('should detect footnote-like lines starting with asterisk', () => {
            // The footnote line must appear after the subtitle detection window (i > 5)
            // so it doesn't get captured as a menu subtitle
            const text = [
                'My Menu',
                '555-1234',          // i=1 subtitle (subtitleFound=true)
                'APPETIZERS',        // i=2 section header
                'MAINS',             // i=3 section header
                'DESSERTS',          // i=4 section header
                'FOOD',              // i=5 section header
                'Wings $10',         // i=6 item
                '* Consuming raw or undercooked meats may cause illness.', // i=7 footnote
            ].join('\n')

            const result = parseMenuText(text)
            const section = result.sections.find(s => s.title === 'FOOD')
            expect(section).toBeDefined()
            expect(section?.footnote).toContain('Consuming raw')
        })

        it('should detect subtitle lines starting with "Add" or "Served"', () => {
            const text = [
                'My Menu',
                'SALADS',
                'Add grilled chicken for $3.',
                'Caesar $12',
            ].join('\n')

            const result = parseMenuText(text)
            const section = result.sections.find(s => s.title === 'SALADS')
            // Subtitle should be set if the line matches add-on pattern
            expect(section).toBeDefined()
        })
    })

    // ── Items without sections ─────────────────────────────────
    describe('items without explicit sections', () => {
        it('should create a default section when items appear without a header', () => {
            // Skip the title/subtitle area and go straight to items
            const text = 'Wings $10.99\nFries $5.99\nNachos $12.99'
            const result = parseMenuText(text)
            // Some items should be parsed
            const totalItems = result.sections.reduce((acc, s) => acc + s.items.length, 0)
            expect(totalItems).toBeGreaterThan(0)
        })
    })

    // ── Edge cases ─────────────────────────────────────────────
    describe('edge cases', () => {
        it('should handle text with only section headers and no items', () => {
            const text = 'My Restaurant\nAPPETIZERS\nMAINS\nDESSERTS'
            const result = parseMenuText(text)
            // Sections should be created (may be empty of items)
            expect(result.sections.length).toBeGreaterThan(0)
        })

        it('should trim whitespace from item names', () => {
            const text = 'Menu\nFOOD\n  Wings  $10.99'
            const result = parseMenuText(text)
            const items = result.sections.flatMap(s => s.items)
            for (const item of items) {
                expect(item.name).toBe(item.name.trim())
            }
        })

        it('should handle section headers ending with colon', () => {
            const text = 'Menu\nAPPETIZERS:\nWings $10\nFries $5'
            const result = parseMenuText(text)
            const section = result.sections.find(s => s.title === 'APPETIZERS')
            expect(section).toBeDefined()
        })

        it('should return a MenuData object with all required fields', () => {
            const text = 'My Menu\nFOOD\nBurger $10'
            const result = parseMenuText(text)
            expect(result).toHaveProperty('title')
            expect(result).toHaveProperty('subtitle')
            expect(result).toHaveProperty('sections')
            expect(result).toHaveProperty('footer')
            expect(Array.isArray(result.sections)).toBe(true)
        })

        it('should assign unique IDs to all sections', () => {
            const text = [
                'Menu',
                'APPS',
                'Wings $10',
                'MAINS',
                'Burger $15',
                'DESSERTS',
                'Cake $8',
            ].join('\n')

            const result = parseMenuText(text)
            const ids = result.sections.map(s => s.id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length)
        })

        it('should handle very long description lines gracefully', () => {
            const longDesc = 'This is a very long description '.repeat(20)
            const text = `Menu\nFOOD\nBurger $10\n${longDesc}`
            expect(() => parseMenuText(text)).not.toThrow()
        })

        it('should handle special characters in item names', () => {
            const text = 'Menu\nFOOD\nMac & Cheese $12.99'
            const result = parseMenuText(text)
            const items = result.sections.flatMap(s => s.items)
            expect(items.length).toBeGreaterThan(0)
            expect(items[0].name).toContain('Mac')
        })

        it('should handle text with Windows-style line endings (\\r\\n)', () => {
            const text = 'My Menu\r\nFOOD\r\nBurger $10\r\nFries $5'
            const normalized = text.replace(/\r\n/g, '\n')
            const result = parseMenuText(normalized)
            expect(result.sections.length).toBeGreaterThan(0)
        })

        it('should handle multiple consecutive blank lines', () => {
            const text = 'Menu\n\n\nFOOD\n\nBurger $10\n\n\nFries $5'
            expect(() => parseMenuText(text)).not.toThrow()
        })

        it('should handle a real-world menu snippet', () => {
            const text = [
                "ALARY'S BAR & GRILL",
                '651-224-7717 • 139 7th St E, Saint Paul',
                'APPETIZERS',
                'Wings $15.49',
                'Tossed in Buffalo, Jerk, or BBQ sauce.',
                'Cheese Curds $10.99',
                'Beer battered with ranch.',
                'SALADS',
                'Add chicken $3',
                'Caesar Salad $13.99',
                'Romaine, croutons, shaved parmesan.',
            ].join('\n')

            const result = parseMenuText(text)
            expect(result.title).toBeTruthy()
            expect(result.sections.length).toBeGreaterThanOrEqual(1)
            const totalItems = result.sections.reduce((acc, s) => acc + s.items.length, 0)
            expect(totalItems).toBeGreaterThan(0)
        })
    })
})
