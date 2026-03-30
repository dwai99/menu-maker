import { useEffect } from 'react'
import { nanoid } from 'nanoid'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { parseMenuText } from '@/utils/parse-menu-text'
import type { MenuData, MenuSection, MenuItem } from '@/models/menu'

/**
 * Hook for importing image files (PNG, JPG, HEIC, WEBP) and parsing them
 * into menu data. Uses Claude Vision API when an API key is configured
 * (much better quality), falls back to Tesseract.js OCR locally.
 *
 * Progress state is stored in ui-store so AppShell can display a toast.
 */
export function useImportImage() {
  const loadMenuData = useMenuStore((state) => state.loadMenuData)
  const markDirty = useUIStore((state) => state.markDirty)
  const setOcrProgress = useUIStore((state) => state.setOcrProgress)
  const ocrProgress = useUIStore((state) => state.ocrProgress)

  // Listen for OCR progress updates from main process
  useEffect(() => {
    if (!window.electronAPI?.onOcrProgress) return
    const cleanup = window.electronAPI.onOcrProgress((data) => {
      setOcrProgress({ active: true, progress: data.progress, message: data.message })
    })
    return cleanup
  }, [setOcrProgress])

  const importImage = async (): Promise<void> => {
    if (!window.electronAPI) return
    try {
      const { canceled, filePaths } = await window.electronAPI.showOpenImportImageDialog()
      if (canceled || !filePaths || filePaths.length === 0) return

      const filePath = filePaths[0]
      setOcrProgress({ active: true, progress: 0, message: 'Reading image...' })

      const result = await window.electronAPI.ocrImage(filePath)

      if (!result.success) {
        throw new Error(result.error || 'Import failed')
      }

      // Claude Vision returns structured menuData directly
      if (result.menuData) {
        const menuData = normalizeMenuData(result.menuData)
        const totalItems = menuData.sections.reduce((sum, s) => sum + s.items.length, 0)
        if (totalItems === 0) {
          throw new Error('Could not extract any menu items from the image.')
        }
        loadMenuData(menuData)
        markDirty()
        setOcrProgress({ active: true, progress: 100, message: 'Done!' })
        console.log(`Imported via AI: ${menuData.sections.length} sections, ${totalItems} items`)
        return
      }

      // Tesseract fallback returns raw text
      if (!result.text || result.text.trim().length === 0) {
        throw new Error('No text found in image. Make sure the image contains readable menu text.')
      }

      setOcrProgress({ active: true, progress: 95, message: 'Parsing menu...' })
      const menuData = parseMenuText(result.text)
      const totalItems = menuData.sections.reduce((sum, s) => sum + s.items.length, 0)
      if (totalItems === 0) {
        throw new Error('Could not extract any menu items from the image.')
      }

      loadMenuData(menuData)
      markDirty()
      setOcrProgress({ active: true, progress: 100, message: 'Done!' })
      console.log(`Imported via OCR: ${menuData.sections.length} sections, ${totalItems} items`)
    } catch (error) {
      console.error('Image import error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to import image: ${message}`)
    } finally {
      setTimeout(() => {
        setOcrProgress({ active: false, progress: 0, message: '' })
      }, 1200)
    }
  }

  // Listen for menu bar "Import from Photo..." command
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onMenuImportImage(() => {
      importImage().catch((err) => {
        console.error('Menu bar image import failed:', err)
      })
    })
    return cleanup
  }, [])

  return {
    importImage,
    isProcessing: ocrProgress.active,
    progress: ocrProgress.progress,
    progressMessage: ocrProgress.message,
  }
}

/**
 * Normalize Claude's JSON response into a proper MenuData with IDs.
 * Claude returns the right shape but without nanoid IDs.
 */
function normalizeMenuData(raw: any): MenuData {
  const sections: MenuSection[] = (raw.sections || []).map((s: any) => ({
    id: nanoid(),
    title: s.title || '',
    subtitle: s.subtitle || '',
    footnote: s.footnote || '',
    items: (s.items || []).map((item: any): MenuItem => ({
      id: nanoid(),
      name: item.name || '',
      description: item.description || '',
      price: item.price || '',
      priceLabel: item.priceLabel || '',
      tags: item.tags || [],
      isAvailable: true,
    })),
  }))

  return {
    title: raw.title || '',
    subtitle: raw.subtitle || '',
    sections,
    footer: raw.footer || '',
  }
}
