import { describe, it, expect } from 'vitest'
import { migrateProject, createNewProject } from '../project'

describe('Project Model', () => {
    // ── createNewProject ──────────────────────────────────────
    describe('createNewProject', () => {
        it('should create a v3 project', () => {
            const project = createNewProject()
            expect(project.version).toBe(3)
        })

        it('should have valid timestamps', () => {
            const project = createNewProject()
            expect(project.createdAt).toBeTruthy()
            expect(project.updatedAt).toBeTruthy()
            // Should be valid ISO date strings
            expect(new Date(project.createdAt).getTime()).not.toBeNaN()
            expect(new Date(project.updatedAt).getTime()).not.toBeNaN()
        })

        it('should have default menu data', () => {
            const project = createNewProject()
            expect(project.menuData).toBeDefined()
            expect(project.menuData.title).toBeTruthy()
            expect(project.menuData.sections.length).toBeGreaterThan(0)
        })

        it('should have default page layout', () => {
            const project = createNewProject()
            expect(project.pageLayout).toBeDefined()
            expect(project.pageLayout.pageSize).toBe('letter')
        })
    })

    // ── migrateProject ────────────────────────────────────────
    describe('migrateProject', () => {
        it('should return v3 projects unchanged', () => {
            const input = {
                version: 3,
                menuData: { title: 'Test', subtitle: '', sections: [], footer: '' },
                pageLayout: {
                    pageSize: 'letter',
                    orientation: 'portrait',
                    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
                    columnCount: 1,
                    layoutDirection: 'vertical',
                    sectionLayouts: [],
                    colorScheme: { background: '#fff', text: '#000', accent: '#333', border: '#ccc' },
                    typography: {},
                    itemSeparator: 'none',
                    priceFormat: 'right-aligned',
                    sectionDecoration: 'none',
                    currency: '$',
                    backgroundTexture: 'none',
                    sectionDivider: 'none',
                    pageBorder: 'none',
                    sectionGap: 16,
                },
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            }
            const result = migrateProject(input)
            expect(result.version).toBe(3)
            expect(result.menuData.title).toBe('Test')
        })

        it('should upgrade v2 → v3', () => {
            const input = {
                version: 2,
                menuData: { title: 'V2 Menu', subtitle: '', sections: [], footer: '' },
                pageLayout: {
                    pageSize: 'letter',
                    orientation: 'portrait',
                    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
                    columnCount: 1,
                    layoutDirection: 'vertical',
                    sectionLayouts: [],
                    colorScheme: { background: '#fff', text: '#000', accent: '#333', border: '#ccc' },
                    typography: {},
                    itemSeparator: 'none',
                    priceFormat: 'right-aligned',
                    sectionDecoration: 'none',
                    currency: '$',
                    backgroundTexture: 'none',
                    sectionDivider: 'none',
                    pageBorder: 'none',
                    sectionGap: 16,
                },
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            }
            const result = migrateProject(input)
            expect(result.version).toBe(3)
        })

        it('should upgrade v1 → v2 and convert rect to polygon layouts', () => {
            const input = {
                version: 1,
                menuData: { title: 'V1 Menu', subtitle: '', sections: [], footer: '' },
                pageLayout: {
                    pageSize: 'letter',
                    orientation: 'portrait',
                    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
                    sectionLayouts: [
                        { sectionId: 'sec-1', x: 0, y: 0, width: 50, height: 50, columnCount: 1, pageIndex: 0 },
                    ],
                    colorScheme: { background: '#fff', text: '#000', accent: '#333', border: '#ccc' },
                    typography: {},
                    itemSeparator: 'none',
                    priceFormat: 'right-aligned',
                },
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            }
            const result = migrateProject(input)
            expect(result.version).toBe(2)
            const sl = result.pageLayout.sectionLayouts[0]
            expect(sl.polygon).toBeDefined()
            expect(sl.polygon).toEqual([[0, 0], [50, 0], [50, 50], [0, 50]])
        })

        it('should backfill missing fields on v2', () => {
            const input = {
                version: 2,
                menuData: { title: 'V2', subtitle: '', sections: [], footer: '' },
                pageLayout: {
                    pageSize: 'letter',
                    orientation: 'portrait',
                    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
                    columnCount: 1,
                    sectionLayouts: [],
                    colorScheme: { background: '#fff', text: '#000', accent: '#333', border: '#ccc' },
                    typography: {},
                    itemSeparator: 'none',
                    priceFormat: 'right-aligned',
                    // Missing: layoutDirection, sectionDecoration, currency, etc.
                },
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            }
            const result = migrateProject(input)
            expect(result.pageLayout.layoutDirection).toBe('vertical')
            expect(result.pageLayout.sectionDecoration).toBe('none')
            expect(result.pageLayout.currency).toBe('$')
            expect(result.pageLayout.backgroundTexture).toBe('none')
            expect(result.pageLayout.sectionDivider).toBe('none')
            expect(result.pageLayout.pageBorder).toBe('none')
            expect(result.pageLayout.sectionGap).toBe(16)
        })

        it('should add columnCount when missing in v1', () => {
            const input = {
                version: 1,
                menuData: { title: 'V1', subtitle: '', sections: [], footer: '' },
                pageLayout: {
                    pageSize: 'letter',
                    orientation: 'portrait',
                    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
                    sectionLayouts: [],
                    colorScheme: { background: '#fff', text: '#000', accent: '#333', border: '#ccc' },
                    typography: {},
                    itemSeparator: 'none',
                    priceFormat: 'right-aligned',
                },
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            }
            const result = migrateProject(input)
            expect(result.pageLayout.columnCount).toBe(1)
        })
    })
})
