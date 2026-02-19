import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // File operations
  fileSave: (filePath: string, projectJson: string) =>
    ipcRenderer.invoke('file:save', filePath, projectJson),
  fileOpen: (filePath: string) =>
    ipcRenderer.invoke('file:open', filePath),
  readBinary: (filePath: string) =>
    ipcRenderer.invoke('file:read-binary', filePath),

  // Dialogs
  showSaveDialog: () => ipcRenderer.invoke('dialog:save'),
  showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
  showOpenPdfDialog: () => ipcRenderer.invoke('dialog:open-pdf'),
  showOpenImageDialog: () => ipcRenderer.invoke('dialog:open-image'),
  showOpenImportImageDialog: () => ipcRenderer.invoke('dialog:open-import-image'),

  // PDF import/export
  parsePdf: (filePath: string) =>
    ipcRenderer.invoke('import:parse-pdf', filePath) as Promise<{ success: boolean; text?: string; numPages?: number; error?: string }>,
  exportPdf: (options: { pageWidth: number; pageHeight: number }) =>
    ipcRenderer.invoke('export:pdf', options),
  exportImage: (options: { pageWidth: number; pageHeight: number; format: 'png' | 'jpeg' }) =>
    ipcRenderer.invoke('export:image', options),
  saveImageData: (options: { dataUrl: string; format: 'png' | 'jpeg'; defaultName: string }) =>
    ipcRenderer.invoke('save-image-data', options),
  printPage: () =>
    ipcRenderer.invoke('print:page'),

  // Custom templates
  saveCustomTemplate: (name: string, projectJson: string) =>
    ipcRenderer.invoke('template:save-custom', name, projectJson),
  listCustomTemplates: () =>
    ipcRenderer.invoke('template:list-custom') as Promise<{ success: boolean; templates: { name: string; path: string }[]; error?: string }>,
  loadCustomTemplate: (filePath: string) =>
    ipcRenderer.invoke('template:load-custom', filePath) as Promise<{ success: boolean; data?: string; error?: string }>,
  deleteCustomTemplate: (filePath: string) =>
    ipcRenderer.invoke('template:delete-custom', filePath),

  // Menu commands from main process
  onMenuNew: (callback: () => void) => {
    ipcRenderer.on('menu:new', callback)
    return () => ipcRenderer.removeListener('menu:new', callback)
  },
  onMenuOpen: (callback: () => void) => {
    ipcRenderer.on('menu:open', callback)
    return () => ipcRenderer.removeListener('menu:open', callback)
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu:save', callback)
    return () => ipcRenderer.removeListener('menu:save', callback)
  },
  onMenuSaveAs: (callback: () => void) => {
    ipcRenderer.on('menu:save-as', callback)
    return () => ipcRenderer.removeListener('menu:save-as', callback)
  },
  onMenuExportPdf: (callback: () => void) => {
    ipcRenderer.on('menu:export-pdf', callback)
    return () => ipcRenderer.removeListener('menu:export-pdf', callback)
  },
  onMenuImportPdf: (callback: () => void) => {
    ipcRenderer.on('menu:import-pdf', callback)
    return () => ipcRenderer.removeListener('menu:import-pdf', callback)
  },
  onMenuImportImage: (callback: () => void) => {
    ipcRenderer.on('menu:import-image', callback)
    return () => ipcRenderer.removeListener('menu:import-image', callback)
  },
  onMenuImportData: (callback: () => void) => {
    ipcRenderer.on('menu:import-data', callback)
    return () => ipcRenderer.removeListener('menu:import-data', callback)
  },
  onMenuUndo: (callback: () => void) => {
    ipcRenderer.on('menu:undo', callback)
    return () => ipcRenderer.removeListener('menu:undo', callback)
  },
  onMenuRedo: (callback: () => void) => {
    ipcRenderer.on('menu:redo', callback)
    return () => ipcRenderer.removeListener('menu:redo', callback)
  },

  // Window title
  setWindowTitle: (title: string) =>
    ipcRenderer.invoke('window:set-title', title),

  // Recent files
  getRecentFiles: () =>
    ipcRenderer.invoke('file:get-recent') as Promise<string[]>,
  addRecentFile: (filePath: string) =>
    ipcRenderer.invoke('file:add-recent', filePath),
  onMenuOpenRecent: (callback: (filePath: string) => void) => {
    const handler = (_event: any, filePath: string) => callback(filePath)
    ipcRenderer.on('menu:open-recent', handler)
    return () => ipcRenderer.removeListener('menu:open-recent', handler)
  },

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),

  // Version history
  createSnapshot: (options: { projectFilePath: string; projectJson: string; summary?: string }) =>
    ipcRenderer.invoke('version:create-snapshot', options),
  listVersions: (projectFilePath: string) =>
    ipcRenderer.invoke('version:list', projectFilePath),
  loadSnapshot: (options: { projectFilePath: string; versionId: string }) =>
    ipcRenderer.invoke('version:load-snapshot', options),
  diffSummary: (options: { oldJson: string; newJson: string }) =>
    ipcRenderer.invoke('version:diff-summary', options),
})
