import { useEffect } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { parseMenuText } from '@/utils/parse-menu-text'

/**
 * Hook for importing PDF files and parsing them into menu data.
 * Text parsing is delegated to the shared parseMenuText utility.
 */
export function useImportPdf() {
  const loadMenuData = useMenuStore((state) => state.loadMenuData)
  const markDirty = useUIStore((state) => state.markDirty)

  const importPdf = async (): Promise<void> => {
    if (!window.electronAPI) return
    try {
      // Show file open dialog
      const { canceled, filePaths } = await window.electronAPI.showOpenPdfDialog()

      if (canceled || !filePaths || filePaths.length === 0) {
        return
      }

      const filePath = filePaths[0]

      // Use pdf-parse via main process to extract text
      const result = await window.electronAPI.parsePdf(filePath)

      if (!result.success || !result.text) {
        throw new Error(result.error || 'Failed to extract text from PDF')
      }

      const extractedText = result.text

      if (extractedText.trim().length === 0) {
        throw new Error(
          'No text content found in PDF. The PDF may be image-based or encrypted.'
        )
      }

      // Parse text into menu data
      const menuData = parseMenuText(extractedText)

      // Validate that we got some items
      const totalItems = menuData.sections.reduce(
        (sum, section) => sum + section.items.length,
        0
      )

      if (totalItems === 0) {
        throw new Error(
          'Could not extract any menu items from the PDF. The file may not contain recognizable menu content.'
        )
      }

      // Load the parsed menu data
      loadMenuData(menuData)
      markDirty()

      console.log(
        `Imported PDF: ${menuData.sections.length} sections, ${totalItems} items from ${result.numPages} pages`
      )
    } catch (error) {
      console.error('PDF import error:', error)
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to import PDF: ${message}`)
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
