import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join, basename, resolve } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { gunzipSync, gzipSync } from 'zlib'
import { PDFParse } from 'pdf-parse'
import { createWorker } from 'tesseract.js'
import { createSnapshot, listVersions, loadSnapshot, diffSummary } from './version-history'

let mainWindow: BrowserWindow | null = null

// ── Path Security ────────────────────────────────────────────
// Track file paths selected via native dialogs or loaded from recent files.
// Only these paths (plus auto-save companions) are permitted for file I/O.

const allowedPaths = new Set<string>()

function allowPath(filePath: string): void {
  allowedPaths.add(resolve(filePath))
}

function isAllowedPath(filePath: string): boolean {
  const resolved = resolve(filePath)
  if (allowedPaths.has(resolved)) return true
  // Allow .autosave companion files for allowed project files
  if (resolved.endsWith('.autosave') && allowedPaths.has(resolved.replace(/\.autosave$/, ''))) return true
  return false
}

function isInsideTemplatesDir(filePath: string): boolean {
  const templatesDir = resolve(getTemplatesDir())
  const resolved = resolve(filePath)
  return resolved.startsWith(templatesDir + '/')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    title: 'Menu Maker',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // DevTools: use Cmd+Option+I (Mac) or Ctrl+Shift+I (Win/Linux) when needed

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Ensure a window exists and is ready to receive IPC messages.
 * Recreates the window if it was closed (macOS keeps app alive without windows).
 * Returns a promise that resolves with the window's webContents.
 */
function ensureWindow(): Promise<Electron.WebContents> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.webContents.isLoading()) {
      return new Promise((resolve) => {
        mainWindow!.webContents.once('did-finish-load', () => {
          resolve(mainWindow!.webContents)
        })
      })
    }
    return Promise.resolve(mainWindow.webContents)
  }
  createWindow()
  return new Promise((resolve) => {
    mainWindow!.webContents.once('did-finish-load', () => {
      resolve(mainWindow!.webContents)
    })
  })
}

// ── IPC Handlers ────────────────────────────────────────────

ipcMain.handle('file:save', async (_event, filePath: string, projectJson: string) => {
  if (!isAllowedPath(filePath)) return { success: false, error: 'Path not permitted' }
  try {
    const compressed = gzipSync(Buffer.from(projectJson, 'utf-8'))
    writeFileSync(filePath, compressed)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('file:open', async (_event, filePath: string) => {
  if (!isAllowedPath(filePath)) return { success: false, error: 'Path not permitted' }
  try {
    const compressed = readFileSync(filePath)
    const decompressed = gunzipSync(compressed).toString('utf-8')
    return { success: true, data: decompressed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('dialog:save', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Menu Project',
    defaultPath: 'Untitled.menu',
    filters: [
      { name: 'Menu Project', extensions: ['menu'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (!result.canceled && result.filePath) allowPath(result.filePath)
  return result
})

ipcMain.handle('dialog:open', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Menu Project',
    filters: [
      { name: 'Menu Project', extensions: ['menu'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    result.filePaths.forEach((p) => allowPath(p))
  }
  return result
})

ipcMain.handle('dialog:open-pdf', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import PDF Menu',
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
    ],
    properties: ['openFile'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    result.filePaths.forEach((p) => allowPath(p))
  }
  return result
})

ipcMain.handle('dialog:open-image', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Logo Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] },
    ],
    properties: ['openFile'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    result.filePaths.forEach((p) => allowPath(p))
  }
  return result
})

ipcMain.handle('dialog:open-import-image', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Menu from Image',
    filters: [
      { name: 'Images & PDF', extensions: ['png', 'jpg', 'jpeg', 'heic', 'webp', 'pdf'] },
    ],
    properties: ['openFile'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    result.filePaths.forEach((p) => allowPath(p))
  }
  return result
})

ipcMain.handle('file:read-binary', async (_event, filePath: string) => {
  if (!isAllowedPath(filePath)) return { success: false, error: 'Path not permitted' }
  try {
    const data = readFileSync(filePath)
    return { success: true, data: data.toString('base64') }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('import:parse-pdf', async (_event, filePath: string) => {
  if (!isAllowedPath(filePath)) return { success: false, error: 'Path not permitted' }

  // PDFs have extractable text — use fast local pdf-parse first.
  // Only fall back to Claude AI for image-based PDFs with no text.
  try {
    const fileBuffer = readFileSync(filePath)
    const uint8 = new Uint8Array(fileBuffer)
    const parser: any = new PDFParse(uint8)
    await parser.load()
    const result = await parser.getText()
    const fullText = result.pages.map((p: { text: string }) => p.text).join('\n\n')

    // If we got meaningful text, return it for local parsing (free + instant)
    if (fullText.trim().length > 20) {
      return { success: true, text: fullText, numPages: result.total }
    }

    // Image-based PDF with no extractable text — try Claude if API key available
    const settings = getSettings()
    const apiKey = settings['anthropicApiKey']
    if (apiKey) {
      console.log('[import:parse-pdf] No text in PDF, trying Claude Vision...')
      const aiResult = await parsePdfWithClaude(filePath, apiKey)
      return aiResult
    }

    // No text and no API key
    return { success: false, error: 'This PDF appears to be image-based with no extractable text. Configure an API key in AI Settings to import image-based PDFs.' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('import:ocr-image', async (_event, filePath: string) => {
  if (!isAllowedPath(filePath)) return { success: false, error: 'Path not permitted' }

  // Try Claude Vision API first (much better quality), fall back to Tesseract
  const settings = getSettings()
  const apiKey = settings['anthropicApiKey']
  console.log('[import:ocr-image] API key present:', !!apiKey, apiKey ? `(${apiKey.substring(0, 10)}...)` : '')

  if (apiKey) {
    try {
      const result = await ocrWithClaude(filePath, apiKey)
      console.log('[import:ocr-image] Claude Vision succeeded, menuData:', !!result.menuData, 'text:', !!result.text)
      return result
    } catch (error: any) {
      console.error('[import:ocr-image] Claude Vision FAILED:', error.message)
      // Don't silently fall back — tell the user what happened
      return { success: false, error: `AI import failed: ${error.message}` }
    }
  } else {
    console.log('[import:ocr-image] No API key, using Tesseract')
  }

  // Fallback: Tesseract OCR (local, no API key needed, poor quality)
  try {
    mainWindow?.webContents.send('ocr:progress', { progress: 10, message: 'Starting OCR (local)...' })

    const worker = await createWorker('eng', 1, {
      logger: (info: { status: string; progress: number }) => {
        if (info.status === 'recognizing text') {
          const pct = Math.round(10 + info.progress * 85)
          mainWindow?.webContents.send('ocr:progress', {
            progress: pct,
            message: `Recognizing text... ${Math.round(info.progress * 100)}%`,
          })
        }
      },
    })

    try {
      const { data } = await worker.recognize(filePath)
      mainWindow?.webContents.send('ocr:progress', { progress: 95, message: 'Parsing menu...' })
      return { success: true, text: data.text }
    } finally {
      await worker.terminate()
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

/**
 * Use Claude Vision API to extract structured menu data from an image.
 * Returns { success, menuData } with parsed JSON, or { success, text } as fallback.
 */
async function ocrWithClaude(filePath: string, apiKey: string): Promise<{ success: boolean; menuData?: any; text?: string; error?: string }> {
  mainWindow?.webContents.send('ocr:progress', { progress: 10, message: 'Reading image...' })

  const imageBuffer = readFileSync(filePath)
  const base64 = imageBuffer.toString('base64')
  const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
  }
  const mediaType = mimeMap[ext] ?? 'image/png'

  mainWindow?.webContents.send('ocr:progress', { progress: 20, message: 'Analyzing menu with AI...' })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Extract all menu content from this image. Return ONLY valid JSON (no markdown, no backticks) in this exact format:

{
  "title": "Restaurant Name",
  "subtitle": "Optional tagline or address",
  "sections": [
    {
      "title": "SECTION NAME",
      "subtitle": "",
      "footnote": "",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description if any",
          "price": "12.99",
          "priceLabel": ""
        }
      ]
    }
  ],
  "footer": "Any footer text like disclaimers"
}

Rules:
- Read EVERY item on the menu carefully, including descriptions
- Price should be just the number (no $ sign)
- If an item has multiple prices (e.g. "Cup $5 / Bowl $8"), use the first price and put the full pricing info in priceLabel
- Group items under their section headings
- If there's no clear section heading, use a reasonable category name
- Include any footnotes, dietary notes, or special instructions in the section footnote or item description
- Be precise — read the actual text, don't guess or paraphrase`
          },
        ],
      }],
    }),
  })

  console.log('[ocrWithClaude] Response status:', response.status)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[ocrWithClaude] API error body:', errorBody)
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your Anthropic API key in AI Settings.')
    }
    throw new Error(`API error ${response.status}: ${errorBody}`)
  }

  mainWindow?.webContents.send('ocr:progress', { progress: 80, message: 'Parsing results...' })

  const result = await response.json() as any
  const text = result.content?.[0]?.text || ''
  console.log('[ocrWithClaude] Response text length:', text.length, 'first 200 chars:', text.substring(0, 200))

  // Try to parse as JSON (Claude should return structured data)
  try {
    // Strip any markdown code fences if present
    const jsonStr = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const menuData = JSON.parse(jsonStr)
    const itemCount = (menuData.sections || []).reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0)
    console.log('[ocrWithClaude] Parsed JSON: title=', menuData.title, 'sections=', menuData.sections?.length, 'items=', itemCount)

    mainWindow?.webContents.send('ocr:progress', { progress: 95, message: 'Done!' })
    return { success: true, menuData }
  } catch (parseErr: any) {
    console.error('[ocrWithClaude] JSON parse failed:', parseErr.message, 'raw text:', text.substring(0, 500))
    // If JSON parsing fails, return as raw text for parseMenuText fallback
    mainWindow?.webContents.send('ocr:progress', { progress: 95, message: 'Done!' })
    return { success: true, text }
  }
}

/**
 * Use Claude API to extract structured menu data from a PDF document.
 * Claude supports PDF files directly via the document content type.
 */
async function parsePdfWithClaude(filePath: string, apiKey: string): Promise<{ success: boolean; menuData?: any; text?: string; error?: string }> {
  mainWindow?.webContents.send('ocr:progress', { progress: 10, message: 'Reading PDF...' })

  const pdfBuffer = readFileSync(filePath)
  const base64 = pdfBuffer.toString('base64')

  mainWindow?.webContents.send('ocr:progress', { progress: 20, message: 'Analyzing PDF with AI...' })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Extract all menu content from this PDF. Return ONLY valid JSON (no markdown, no backticks) in this exact format:

{
  "title": "Restaurant Name",
  "subtitle": "Optional tagline or address",
  "sections": [
    {
      "title": "SECTION NAME",
      "subtitle": "",
      "footnote": "",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description if any",
          "price": "12.99",
          "priceLabel": ""
        }
      ]
    }
  ],
  "footer": "Any footer text like disclaimers"
}

Rules:
- Read EVERY item on the menu carefully, including descriptions
- Price should be just the number (no $ sign)
- If an item has multiple prices (e.g. "Cup $5 / Bowl $8"), use the first price and put the full pricing info in priceLabel
- Group items under their section headings
- If there's no clear section heading, use a reasonable category name
- Include any footnotes, dietary notes, or special instructions in the section footnote or item description
- Be precise — read the actual text, don't guess or paraphrase`
          },
        ],
      }],
    }),
  })

  console.log('[parsePdfWithClaude] Response status:', response.status)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[parsePdfWithClaude] API error body:', errorBody)
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your Anthropic API key in AI Settings.')
    }
    throw new Error(`API error ${response.status}: ${errorBody}`)
  }

  mainWindow?.webContents.send('ocr:progress', { progress: 80, message: 'Parsing results...' })

  const result = await response.json() as any
  const text = result.content?.[0]?.text || ''
  console.log('[parsePdfWithClaude] Response text length:', text.length)

  try {
    const jsonStr = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const menuData = JSON.parse(jsonStr)
    const itemCount = (menuData.sections || []).reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0)
    console.log('[parsePdfWithClaude] Parsed JSON: title=', menuData.title, 'sections=', menuData.sections?.length, 'items=', itemCount)

    mainWindow?.webContents.send('ocr:progress', { progress: 95, message: 'Done!' })
    return { success: true, menuData }
  } catch (parseErr: any) {
    console.error('[parsePdfWithClaude] JSON parse failed:', parseErr.message)
    mainWindow?.webContents.send('ocr:progress', { progress: 95, message: 'Done!' })
    return { success: true, text }
  }
}

// ── AI Layout Suggestion ────────────────────────────────────

async function aiSuggestLayout(
  contentSummary: string,
  apiKey: string,
): Promise<{ columnCount: number; layoutDirection: string; orientation: string; fontScale: number; reasoning: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: `You are an expert restaurant menu designer with deep knowledge of print layout, typography, and readability. Your job is to analyze menu content and recommend the optimal page layout configuration.

You must return valid JSON matching this schema:
{ "columnCount": 1-4, "layoutDirection": "vertical"|"horizontal", "orientation": "portrait"|"landscape", "fontScale": 0.8-1.2, "reasoning": "brief explanation" }

Layout principles:
- READABILITY is paramount. Menus are scanned quickly — clear hierarchy matters more than fitting everything.
- Column count depends on TOTAL CONTENT DENSITY, not just item count. A menu with 15 items but long descriptions needs fewer columns than 15 items with just names and prices.
- Prefer 1 column for menus with fewer than 10 items or when items have 2+ line descriptions.
- Use 2 columns for 10-25 items with short/medium descriptions. This is the most common optimal layout.
- Use 3 columns only for 25+ items with minimal descriptions (name + price). 3 columns with descriptions looks cramped.
- 4 columns is rare — only for very large menus (40+) with very short items on large paper.
- HORIZONTAL layout direction (sections side-by-side) only makes sense with 3+ columns AND landscape orientation. Otherwise always use VERTICAL.
- LANDSCAPE orientation when: the menu has many short-description items that benefit from wide columns, OR 3+ columns are needed, OR the page size is small (half-letter). Portrait is the default.
- fontScale: prefer 1.0. Only reduce to 0.9 for genuinely dense content that won't fit at default size. Never go below 0.85. Increase to 1.1-1.2 only for very sparse menus (under 8 items) to fill the page.
- Consider the page size: half-letter (5.5×8.5") needs fewer columns than letter (8.5×11"). Legal (8.5×14") can handle more content in portrait.
- Price-only menus (no descriptions) can use more columns since items are compact.`,
      messages: [{
        role: 'user',
        content: `Analyze this menu and suggest the optimal layout. Think step by step about the content density, then provide your JSON recommendation.

${contentSummary}`,
      }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your Anthropic API key in AI Settings.')
    }
    throw new Error(`API error ${response.status}: ${errorBody}`)
  }

  const result = await response.json() as any
  const text = result.content?.[0]?.text || ''

  // Extract JSON from response (may contain reasoning text before the JSON)
  const jsonMatch = text.match(/\{[\s\S]*"columnCount"[\s\S]*"reasoning"[\s\S]*?\}/)
  if (!jsonMatch) {
    // Fallback: try stripping markdown fences
    const jsonStr = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
    const suggestion = JSON.parse(jsonStr)
    return clampSuggestion(suggestion)
  }

  const suggestion = JSON.parse(jsonMatch[0])
  return clampSuggestion(suggestion)
}

function clampSuggestion(suggestion: any): { columnCount: number; layoutDirection: string; orientation: string; fontScale: number; reasoning: string } {
  suggestion.columnCount = Math.max(1, Math.min(4, Math.round(suggestion.columnCount)))
  suggestion.fontScale = Math.max(0.8, Math.min(1.2, suggestion.fontScale))
  if (!['vertical', 'horizontal'].includes(suggestion.layoutDirection)) suggestion.layoutDirection = 'vertical'
  if (!['portrait', 'landscape'].includes(suggestion.orientation)) suggestion.orientation = 'portrait'
  return suggestion
}

ipcMain.handle('ai:suggest-layout', async (_event, contentSummary: string) => {
  const settings = getSettings()
  const apiKey = settings['anthropicApiKey']
  if (!apiKey) {
    return { success: false, error: 'No API key configured. Go to More > AI Settings to add your Anthropic API key.' }
  }
  try {
    const suggestion = await aiSuggestLayout(contentSummary, apiKey)
    return { success: true, suggestion }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('export:image', async (_event, options: { pageWidth: number; pageHeight: number; format: 'png' | 'jpeg' }) => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const ext = options.format === 'jpeg' ? 'jpg' : 'png'
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: `Export ${options.format.toUpperCase()}`,
    defaultPath: `menu.${ext}`,
    filters: [{ name: options.format.toUpperCase(), extensions: [ext] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, error: 'Canceled' }
  }

  try {
    const image = await mainWindow.webContents.capturePage()
    const buffer = options.format === 'jpeg' ? image.toJPEG(90) : image.toPNG()
    writeFileSync(saveResult.filePath, buffer)
    return { success: true, filePath: saveResult.filePath }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Save image from renderer-captured base64 data (html-to-image)
ipcMain.handle('save-image-data', async (_event, options: { dataUrl: string; format: 'png' | 'jpeg'; defaultName: string }) => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const ext = options.format === 'jpeg' ? 'jpg' : 'png'
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: `Export ${options.format.toUpperCase()}`,
    defaultPath: options.defaultName || `menu.${ext}`,
    filters: [{ name: options.format.toUpperCase(), extensions: [ext] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, error: 'Canceled' }
  }

  try {
    // Validate and strip data URL prefix
    const match = options.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
    if (!match) return { success: false, error: 'Invalid image data URL' }
    const buffer = Buffer.from(match[2], 'base64')
    writeFileSync(saveResult.filePath, buffer)
    return { success: true, filePath: saveResult.filePath }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('dialog:save-directory', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Export Folder',
    properties: ['openDirectory', 'createDirectory'],
  })
  return { canceled: result.canceled, directoryPath: result.filePaths?.[0] }
})

ipcMain.handle('save-image-to-path', async (_event, options: { dataUrl: string; filePath: string }) => {
  try {
    const base64Data = options.dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    writeFileSync(options.filePath, buffer)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ── Version History ─────────────────────────────────────────

ipcMain.handle('version:create-snapshot', async (_event, options: { projectFilePath: string; projectJson: string; summary?: string }) => {
  if (!isAllowedPath(options.projectFilePath)) return { success: false, error: 'Path not permitted' }
  try {
    const entry = createSnapshot(options.projectFilePath, options.projectJson, options.summary)
    return { success: true, entry }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('version:list', async (_event, projectFilePath: string) => {
  if (!isAllowedPath(projectFilePath)) return { success: false, error: 'Path not permitted' }
  try {
    const entries = listVersions(projectFilePath)
    return { success: true, entries }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('version:load-snapshot', async (_event, options: { projectFilePath: string; versionId: string }) => {
  if (!isAllowedPath(options.projectFilePath)) return { success: false, error: 'Path not permitted' }
  try {
    const data = loadSnapshot(options.projectFilePath, options.versionId)
    if (!data) return { success: false, error: 'Snapshot not found' }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('version:diff-summary', async (_event, options: { oldJson: string; newJson: string }) => {
  try {
    const summary = diffSummary(options.oldJson, options.newJson)
    return { success: true, summary }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('print:page', async () => {
  if (!mainWindow) return { success: false, error: 'No window' }
  try {
    mainWindow.webContents.print({}, (success, failureReason) => {
      if (!success) console.error('Print failed:', failureReason)
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

const getTemplatesDir = () => {
  const dir = join(app.getPath('userData'), 'custom-templates')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

ipcMain.handle('template:save-custom', async (_event, name: string, projectJson: string) => {
  try {
    const dir = getTemplatesDir()
    const safeName = name.replace(/[^a-zA-Z0-9_\-]/g, '_').trim()
    if (!safeName) return { success: false, error: 'Invalid template name' }
    const filePath = join(dir, `${safeName}.json`)
    writeFileSync(filePath, projectJson, 'utf-8')
    return { success: true, filePath }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('template:list-custom', async () => {
  try {
    const dir = getTemplatesDir()
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    const templates = files.map((f) => ({
      name: f.replace('.json', ''),
      path: join(dir, f),
    }))
    return { success: true, templates }
  } catch (error: any) {
    return { success: false, error: error.message, templates: [] }
  }
})

ipcMain.handle('template:load-custom', async (_event, filePath: string) => {
  if (!isInsideTemplatesDir(filePath)) return { success: false, error: 'Path not permitted' }
  try {
    const data = readFileSync(filePath, 'utf-8')
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('template:delete-custom', async (_event, filePath: string) => {
  if (!isInsideTemplatesDir(filePath)) return { success: false, error: 'Path not permitted' }
  try {
    unlinkSync(filePath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('export:pdf', async (_event, options: { pageWidth: number; pageHeight: number }) => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF',
    defaultPath: 'menu.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, error: 'Canceled' }
  }

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      pageSize: {
        width: options.pageWidth * 25400, // inches to microns
        height: options.pageHeight * 25400,
      },
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    })

    writeFileSync(saveResult.filePath, pdfData)
    return { success: true, filePath: saveResult.filePath }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ── Window Title ────────────────────────────────────────────

ipcMain.handle('window:set-title', (_event, title: string) => {
  mainWindow?.setTitle(title)
})

// ── Recent Files ────────────────────────────────────────────

const getRecentFilesPath = () => join(app.getPath('userData'), 'recent-files.json')

function getRecentFiles(): string[] {
  try {
    const data = readFileSync(getRecentFilesPath(), 'utf-8')
    const files: string[] = JSON.parse(data)
    // Prune non-existent files
    return files.filter((f) => existsSync(f)).slice(0, 10)
  } catch {
    return []
  }
}

function addRecentFile(filePath: string): void {
  const files = getRecentFiles().filter((f) => f !== filePath)
  files.unshift(filePath)
  const pruned = files.slice(0, 10)
  writeFileSync(getRecentFilesPath(), JSON.stringify(pruned), 'utf-8')
  // Rebuild menu to update Open Recent submenu
  buildMenu()
}

ipcMain.handle('file:get-recent', () => {
  const files = getRecentFiles()
  // Pre-allow recent files so they can be opened without a dialog
  files.forEach((f) => allowPath(f))
  return files
})

ipcMain.handle('file:add-recent', (_event, filePath: string) => {
  if (!isAllowedPath(filePath)) return
  addRecentFile(filePath)
})

// ── Settings ────────────────────────────────────────────────

const getSettingsPath = () => join(app.getPath('userData'), 'settings.json')

function getSettings(): Record<string, any> {
  try {
    const data = readFileSync(getSettingsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

function saveSettings(settings: Record<string, any>): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

ipcMain.handle('settings:get', (_event, key: string) => {
  const settings = getSettings()
  return settings[key] ?? null
})

ipcMain.handle('settings:set', (_event, key: string, value: any) => {
  const settings = getSettings()
  settings[key] = value
  saveSettings(settings)
})

// ── App Menu ────────────────────────────────────────────────

function buildMenu(): void {
  const isMac = process.platform === 'darwin'

  // Build Open Recent submenu
  const recentFiles = getRecentFiles()
  const recentSubmenu: Electron.MenuItemConstructorOptions[] = recentFiles.length > 0
    ? [
        ...recentFiles.map((filePath) => ({
          label: basename(filePath),
          click: async () => {
            allowPath(filePath)
            const wc = await ensureWindow()
            wc.send('menu:open-recent', filePath)
          },
        })),
        { type: 'separator' as const },
        {
          label: 'Clear Recent',
          click: () => {
            writeFileSync(getRecentFilesPath(), '[]', 'utf-8')
            buildMenu()
          },
        },
      ]
    : [{ label: 'No Recent Files', enabled: false }]

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        },
      ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:new') },
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:open') },
        },
        {
          label: 'Open Recent',
          submenu: recentSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:save') },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:save-as') },
        },
        { type: 'separator' },
        {
          label: 'Import from PDF...',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:import-pdf') },
        },
        {
          label: 'Import from Photo...',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:import-image') },
        },
        {
          label: 'Import from Text/CSV...',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:import-data') },
        },
        { type: 'separator' },
        {
          label: 'Export PDF...',
          accelerator: 'CmdOrCtrl+E',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:export-pdf') },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:undo') },
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: async () => { const wc = await ensureWindow(); wc.send('menu:redo') },
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(!app.isPackaged ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ── App Lifecycle ───────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
