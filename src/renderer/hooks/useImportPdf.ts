import { useEffect } from 'react'
import { nanoid } from 'nanoid'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { parseMenuText } from '@/utils/parse-menu-text'
import type { MenuData, MenuSection, MenuItem } from '@/models/menu'

/**
 * Hook for importing PDF files and parsing them into menu data.
 * Uses Claude API when an API key is configured (much better quality),
 * falls back to pdf-parse text extraction + parseMenuText heuristics.
 *
 * Progress state is stored in ui-store so AppShell can display a toast.
 */
export function useImportPdf() {
  const loadMenuData = useMenuStore((state) => state.loadMenuData)
  const markDirty = useUIStore((state) => state.markDirty)
  const setOcrProgress = useUIStore((state) => state.setOcrProgress)

  const importPdf = async (): Promise<void> => {
    if (!window.electronAPI) return
    try {
      const { canceled, filePaths } = await window.electronAPI.showOpenPdfDialog()
      if (canceled || !filePaths || filePaths.length === 0) return

      const filePath = filePaths[0]
      setOcrProgress({ active: true, progress: 0, message: 'Reading PDF...' })

      const result = await window.electronAPI.parsePdf(filePath)

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse PDF')
      }

      // Claude returns structured menuData directly
      if (result.menuData) {
        const menuData = normalizeMenuData(result.menuData)
        const totalItems = menuData.sections.reduce((sum, s) => sum + s.items.length, 0)
        if (totalItems === 0) {
          throw new Error('Could not extract any menu items from the PDF.')
        }
        loadMenuData(menuData)
        markDirty()
        setOcrProgress({ active: true, progress: 100, message: 'Done!' })
        console.log(`Imported PDF via AI: ${menuData.sections.length} sections, ${totalItems} items`)
        return
      }

      // Fallback: pdf-parse returned raw text
      const extractedText = result.text
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content found in PDF. The PDF may be image-based or encrypted.')
      }

      setOcrProgress({ active: true, progress: 90, message: 'Parsing menu...' })
      const menuData = parseMenuText(extractedText)
      const totalItems = menuData.sections.reduce((sum, s) => sum + s.items.length, 0)
      if (totalItems === 0) {
        throw new Error('Could not extract any menu items from the PDF.')
      }

      loadMenuData(menuData)
      markDirty()
      setOcrProgress({ active: true, progress: 100, message: 'Done!' })
      console.log(`Imported PDF: ${menuData.sections.length} sections, ${totalItems} items from ${result.numPages} pages`)
    } catch (error) {
      console.error('PDF import error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to import PDF: ${message}`)
    } finally {
      setTimeout(() => {
        setOcrProgress({ active: false, progress: 0, message: '' })
      }, 1200)
    }
  }

  // Listen for menu bar import command
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onMenuImportPdf(() => {
      importPdf().catch((err) => {
        console.error('Menu bar PDF import failed:', err)
      })
    })
    return cleanup
  }, [])

  return { importPdf }
}

/**
 * Normalize Claude's JSON response into a proper MenuData with IDs.
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
