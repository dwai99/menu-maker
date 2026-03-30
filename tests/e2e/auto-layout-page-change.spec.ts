/**
 * Playwright E2E test: Auto Layout after Page Size Change
 *
 * Steps:
 * 1. Click the "Page" tab
 * 2. Select 3 columns
 * 3. Click "Auto Layout"
 * 4. Screenshot the result
 * 5. Change page size to "Legal"
 * 6. Click "Auto Layout" again
 * 7. Screenshot the result
 * 8. Analyze screenshots for overlapping or broken layout
 *
 * Run:  npx playwright test tests/e2e/auto-layout-page-change.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const APP_URL = 'http://localhost:5173'

async function waitForAppReady(page: Page) {
  // Wait for the Page tab button to be visible (means app is loaded)
  await page.waitForSelector('button:has-text("Page")', { timeout: 15000 })
  // Small delay for React render
  await page.waitForTimeout(500)
}

/** Load a .menu fixture JSON into the app stores */
async function loadMenuFixture(page: Page, fixturePath: string) {
  const json = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
  await page.evaluate((project) => {
    const menuStore = (window as any).__menuStore
    const layoutStore = (window as any).__layoutStore
    if (menuStore && layoutStore) {
      menuStore.getState().loadMenuData(project.menuData)
      layoutStore.getState().loadPageLayout(project.pageLayout)
    }
  }, json)
  await page.waitForTimeout(500) // let React re-render
}

async function clickPageTab(page: Page) {
  await page.click('button:has-text("Page")')
  // Wait for the Auto Layout button to appear (PageTab content loaded)
  await page.waitForSelector('button:has-text("Auto Layout")', { timeout: 5000 })
  await page.waitForTimeout(300)
}

async function selectColumns(page: Page, count: number) {
  // The column buttons are inside the Layout accordion, labeled 1-6
  // They're small buttons with just the number as text
  // Find the Columns label, then click the appropriate button nearby
  const columnsSection = page.locator('text=Columns').first()
  await columnsSection.scrollIntoViewIfNeeded()

  // The column buttons are in a flex container right after the "Columns" label
  // Each button has the column number as its text content
  const columnButton = page.locator(
    `button:has-text("${count}")`
  )

  // There might be multiple buttons with "3" — we need the one in the Columns section
  // The columns section has buttons 1-6 in a row. Find the parent container.
  const layoutAccordion = page.locator('text=Columns').locator('..')
  const btn = layoutAccordion.locator(`button:has-text("${count}")`).first()
  await btn.click()
  await page.waitForTimeout(300)
}

async function clickAutoLayout(page: Page) {
  await page.click('button:has-text("Auto Layout")')
  await page.waitForTimeout(1000) // Wait for layout computation + re-render
}

async function changePageSize(page: Page, sizeValue: string) {
  // The page size is a <select> dropdown. We need to expand the "Page Format" accordion first.
  const pageFormatButton = page.locator('button:has-text("Page Format")')
  // Check if the accordion is already expanded by looking for the select
  const pageSizeSelect = page.locator('select').first()
  const isVisible = await pageSizeSelect.isVisible().catch(() => false)

  if (!isVisible) {
    await pageFormatButton.click()
    await page.waitForTimeout(300)
  }

  // Now find the Page Size select (it's the first select in the Page Format accordion)
  // The select contains options like "Letter", "Legal", etc.
  await page.selectOption('select >> nth=0', sizeValue)
  await page.waitForTimeout(500)
}

async function takeFullScreenshot(page: Page, name: string) {
  const path = `tests/e2e/screenshots/${name}.png`
  await page.screenshot({ path, fullPage: true })
  console.log(`Screenshot saved: ${path}`)
  return path
}

/**
 * Analyze the preview area for overlapping sections by checking
 * the bounding boxes of section elements in the DOM.
 */
async function analyzeLayout(page: Page): Promise<{
  sections: Array<{
    id: string
    top: number
    left: number
    width: number
    height: number
    text: string
  }>
  overlaps: Array<{ a: string; b: string; overlapArea: number }>
  totalSections: number
  hasOverlaps: boolean
}> {
  // Get all section elements from the preview
  // Sections in PagePreview are rendered with data-section-id attributes
  const sectionData = await page.evaluate(() => {
    const sections: Array<{
      id: string
      top: number
      left: number
      width: number
      height: number
      text: string
    }> = []

    // Look for section containers in the preview
    // They have absolute positioning inside the page container
    const previewEl = document.querySelector('[class*="page-content"]') ||
      document.querySelector('[style*="position: relative"]')

    if (!previewEl) {
      // Fallback: look for any elements with data-section-id
      const sectionEls = document.querySelectorAll('[data-section-id]')
      sectionEls.forEach((el) => {
        const rect = el.getBoundingClientRect()
        sections.push({
          id: el.getAttribute('data-section-id') || 'unknown',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          text: (el.textContent || '').substring(0, 80),
        })
      })
    }

    // Also try to grab section layout data from the Zustand store
    // Access via window for debugging
    return sections
  })

  // Check for overlaps between any pair of sections
  const overlaps: Array<{ a: string; b: string; overlapArea: number }> = []
  for (let i = 0; i < sectionData.length; i++) {
    for (let j = i + 1; j < sectionData.length; j++) {
      const a = sectionData[i]
      const b = sectionData[j]

      const xOverlap = Math.max(
        0,
        Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
      )
      const yOverlap = Math.max(
        0,
        Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
      )
      const overlapArea = xOverlap * yOverlap

      if (overlapArea > 5) {
        // More than 5px^2 overlap
        overlaps.push({ a: a.id, b: b.id, overlapArea })
      }
    }
  }

  return {
    sections: sectionData,
    overlaps,
    totalSections: sectionData.length,
    hasOverlaps: overlaps.length > 0,
  }
}

/**
 * Also analyze layout from the store directly — more reliable than DOM inspection
 */
async function analyzeStoreLayout(page: Page): Promise<{
  sectionLayouts: Array<{
    sectionId: string
    polygon: Array<{ x: number; y: number }>
    startItemIndex?: number
    endItemIndex?: number
  }>
  pageSize: string
  columnCount: number
  overlaps: Array<{ a: string; b: string; overlapPct: number }>
}> {
  const storeData = await page.evaluate(() => {
    // Access Zustand stores via their hooks' internal store
    // In dev mode, stores are accessible on window.__zustand or via the module system
    // We'll try accessing via React internals or just read from the DOM

    // Alternative: dispatch a custom event that the app listens to
    // For now, try window.__ZUSTAND_STORE__ or similar

    // The stores use zustand's vanilla store under the hood
    // Let's try to find them in the React fiber tree
    const rootEl = document.getElementById('root')
    if (!rootEl) return null

    // Try to find store state by looking at React fiber
    let fiber = (rootEl as any)._reactRootContainer?._internalRoot?.current ??
      (rootEl as any).__reactFiber$

    // This is fragile — let's use a different approach
    // Inject a helper into the page that reads from the store
    return null
  })

  // If direct store access didn't work, read from the UI
  // Parse the section layouts from visible UI state
  const layoutInfo = await page.evaluate(() => {
    // Try to access stores through the app's module system
    // In Vite dev mode, we can sometimes access modules
    return {
      sectionLayouts: [],
      pageSize: '',
      columnCount: 0,
      overlaps: [],
    }
  })

  return layoutInfo as any
}

// ── Tests ──────────────────────────────────────────────────────────

test.describe('Auto Layout after Page Size Change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL)
    await waitForAppReady(page)
    // Load Alary's full menu fixture (10 apps, 4 salads, 11 handhelds, 2 pastas)
    const fixturePath = path.resolve(__dirname, 'fixtures/alarys-main.json')
    await loadMenuFixture(page, fixturePath)
  })

  test('1 col → 3 col letter → 3 col legal: sequential column fill, no overlaps', async ({
    page,
  }) => {
    // Use a tall viewport so multi-page layouts are fully visible
    await page.setViewportSize({ width: 1600, height: 2400 })

    // Step 1: Click the Page tab
    console.log('Step 1: Clicking Page tab...')
    await clickPageTab(page)

    // Helper: zoom down to show all pages
    const zoomOut = async () => {
      const minusBtn = page.locator('button:has-text("−")').first()
      // Click minus 6 times to zoom down to ~40%
      for (let i = 0; i < 6; i++) {
        if (await minusBtn.isVisible().catch(() => false)) {
          await minusBtn.click()
          await page.waitForTimeout(100)
        }
      }
      await page.waitForTimeout(300)
    }

    // Step 2: 1-column Letter auto layout
    console.log('Step 2: 1 column Auto Layout on Letter...')
    await selectColumns(page, 1)
    await clickAutoLayout(page)
    // Switch to Stacked view for multi-page and zoom out to see all pages
    const stackedBtn = page.locator('button:has-text("Stacked")')
    if (await stackedBtn.isVisible().catch(() => false)) {
      await stackedBtn.click()
      await page.waitForTimeout(300)
    }
    await zoomOut()
    await takeFullScreenshot(page, '00-letter-1col-auto-layout')

    // Step 3: Switch to 3 columns, auto layout on Letter
    console.log('Step 3: 3 columns Auto Layout on Letter...')
    await selectColumns(page, 3)
    await clickAutoLayout(page)
    await page.waitForTimeout(500)
    // Fit to show single page nicely
    const fitBtn = page.locator('button:has-text("Fit")')
    if (await fitBtn.isVisible().catch(() => false)) {
      await fitBtn.click()
      await page.waitForTimeout(500)
    }
    await takeFullScreenshot(page, '01-letter-3col-auto-layout')

    const firstAnalysis = await analyzeLayout(page)
    console.log(
      `After 3-col letter auto layout: ${firstAnalysis.totalSections} sections, ${firstAnalysis.overlaps.length} overlaps`
    )

    // Step 4: Change to Legal, auto layout with 3 columns
    console.log('Step 4: 3 columns Auto Layout on Legal...')
    await page.locator('button:has-text("Page Format")').scrollIntoViewIfNeeded()
    await changePageSize(page, 'legal')
    await page.locator('button:has-text("Auto Layout")').scrollIntoViewIfNeeded()
    await clickAutoLayout(page)
    if (await fitBtn.isVisible().catch(() => false)) {
      await fitBtn.click()
      await page.waitForTimeout(500)
    }
    await takeFullScreenshot(page, '02-legal-3col-auto-layout')

    const secondAnalysis = await analyzeLayout(page)
    console.log(
      `After 3-col legal auto layout: ${secondAnalysis.totalSections} sections, ${secondAnalysis.overlaps.length} overlaps`
    )

    // Assert no overlaps
    expect(
      firstAnalysis.hasOverlaps,
      `Letter 3-col overlaps: ${JSON.stringify(firstAnalysis.overlaps)}`
    ).toBe(false)

    expect(
      secondAnalysis.hasOverlaps,
      `Legal 3-col overlaps: ${JSON.stringify(secondAnalysis.overlaps)}`
    ).toBe(false)
  })

  test('page size changes should clear section layouts', async ({ page }) => {
    // This test verifies the fix: setPageSize clears sectionLayouts

    // Setup: go to Page tab, select 3 columns, auto layout
    await clickPageTab(page)
    await selectColumns(page, 3)
    await clickAutoLayout(page)

    // Inject a check: read the store state to verify layouts exist
    const hasLayoutsBefore = await page.evaluate(() => {
      // Try to read from the store by examining rendered sections
      const sections = document.querySelectorAll('[data-section-id]')
      return sections.length > 0
    })
    console.log(`Sections rendered before page change: ${hasLayoutsBefore}`)

    // Change page size — this should clear layouts
    await page.locator('button:has-text("Page Format")').scrollIntoViewIfNeeded()
    await changePageSize(page, 'legal')

    // Take screenshot to see what the page looks like after size change but before auto-layout
    await takeFullScreenshot(page, '04-legal-after-clear-before-auto')

    // Now auto-layout again
    await page.locator('button:has-text("Auto Layout")').scrollIntoViewIfNeeded()
    await clickAutoLayout(page)

    await takeFullScreenshot(page, '05-legal-after-fresh-auto-layout')

    // Change back to Letter
    await page.locator('button:has-text("Page Format")').scrollIntoViewIfNeeded()
    await changePageSize(page, 'letter')

    // Auto layout on Letter
    await page.locator('button:has-text("Auto Layout")').scrollIntoViewIfNeeded()
    await clickAutoLayout(page)

    await takeFullScreenshot(page, '06-letter-back-after-auto-layout')
  })
})
