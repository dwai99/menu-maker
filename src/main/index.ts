import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join, basename, resolve } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { gunzipSync, gzipSync } from 'zlib'
import { PDFParse } from 'pdf-parse'
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

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
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
  try {
    const fileBuffer = readFileSync(filePath)
    const uint8 = new Uint8Array(fileBuffer)
    const parser: any = new PDFParse(uint8)
    await parser.load()
    const result = await parser.getText()
    const fullText = result.pages.map((p: { text: string }) => p.text).join('\n\n')
    return { success: true, text: fullText, numPages: result.total }
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
          click: () => {
            allowPath(filePath)
            mainWindow?.webContents.send('menu:open-recent', filePath)
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
          click: () => mainWindow?.webContents.send('menu:new'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open'),
        },
        {
          label: 'Open Recent',
          submenu: recentSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-as'),
        },
        { type: 'separator' },
        {
          label: 'Import Menu...',
          click: () => mainWindow?.webContents.send('menu:import-pdf'),
        },
        {
          label: 'Import from Photo...',
          click: () => mainWindow?.webContents.send('menu:import-image'),
        },
        {
          label: 'Import Menu Data...',
          click: () => mainWindow?.webContents.send('menu:import-data'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export-pdf'),
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
          click: () => mainWindow?.webContents.send('menu:undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow?.webContents.send('menu:redo'),
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
