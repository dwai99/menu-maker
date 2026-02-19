interface ElectronAPI {
  platform: string

  fileSave: (filePath: string, projectJson: string) => Promise<{ success: boolean; error?: string }>
  fileOpen: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
  readBinary: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>

  showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>
  showOpenPdfDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>
  showOpenImageDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>
  showOpenImportImageDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>

  parsePdf: (filePath: string) => Promise<{ success: boolean; text?: string; numPages?: number; error?: string }>
  exportPdf: (options: { pageWidth: number; pageHeight: number }) => Promise<{ success: boolean; filePath?: string; error?: string }>
  exportImage: (options: { pageWidth: number; pageHeight: number; format: 'png' | 'jpeg' }) => Promise<{ success: boolean; filePath?: string; error?: string }>
  saveImageData: (options: { dataUrl: string; format: 'png' | 'jpeg'; defaultName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>
  printPage: () => Promise<{ success: boolean; error?: string }>

  saveCustomTemplate: (name: string, projectJson: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  listCustomTemplates: () => Promise<{ success: boolean; templates: { name: string; path: string }[]; error?: string }>
  loadCustomTemplate: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
  deleteCustomTemplate: (filePath: string) => Promise<{ success: boolean; error?: string }>

  onMenuNew: (callback: () => void) => () => void
  onMenuOpen: (callback: () => void) => () => void
  onMenuSave: (callback: () => void) => () => void
  onMenuSaveAs: (callback: () => void) => () => void
  onMenuExportPdf: (callback: () => void) => () => void
  onMenuImportPdf: (callback: () => void) => () => void
  onMenuImportImage: (callback: () => void) => () => void
  onMenuImportData: (callback: () => void) => () => void
  onMenuUndo: (callback: () => void) => () => void
  onMenuRedo: (callback: () => void) => () => void

  // Window title
  setWindowTitle: (title: string) => Promise<void>

  // Recent files
  getRecentFiles: () => Promise<string[]>
  addRecentFile: (filePath: string) => Promise<void>
  onMenuOpenRecent: (callback: (filePath: string) => void) => () => void

  // Settings
  getSetting: (key: string) => Promise<any>
  setSetting: (key: string, value: any) => Promise<void>

  // Version history
  createSnapshot: (options: { projectFilePath: string; projectJson: string; summary?: string }) => Promise<{ success: boolean; entry?: any; error?: string }>
  listVersions: (projectFilePath: string) => Promise<{ success: boolean; entries?: any[]; error?: string }>
  loadSnapshot: (options: { projectFilePath: string; versionId: string }) => Promise<{ success: boolean; data?: string; error?: string }>
  diffSummary: (options: { oldJson: string; newJson: string }) => Promise<{ success: boolean; summary?: string; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export { }
