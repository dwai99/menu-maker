import { useEffect } from 'react'
import { createWorker } from 'tesseract.js'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { parseMenuText } from '@/utils/parse-menu-text'

/**
 * Hook for importing image files (PNG, JPG, HEIC, WEBP) and parsing them
 * into menu data via Tesseract.js OCR.
 *
 * Progress state is stored in ui-store so AppShell can display a toast
 * without prop drilling.
 */
export function useImportImage() {
  const loadMenuData = useMenuStore((state) => state.loadMenuData)
  const markDirty = useUIStore((state) => state.markDirty)
  const setOcrProgress = useUIStore((state) => state.setOcrProgress)
  const ocrProgress = useUIStore((state) => state.ocrProgress)

  const importImage = async (): Promise<void> => {
    if (!window.electronAPI) return
    try {
      // Show file open dialog for image files
      const { canceled, filePaths } = await window.electronAPI.showOpenImportImageDialog()

      if (canceled || !filePaths || filePaths.length === 0) {
        return
      }

      const filePath = filePaths[0]

      setOcrProgress({ active: true, progress: 0, message: 'Reading image...' })

      // Read file as base64
      const readResult = await window.electronAPI.readBinary(filePath)

      if (!readResult.success || !readResult.data) {
        throw new Error(readResult.error || 'Failed to read image file')
      }

      // Determine MIME type from file extension
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        heic: 'image/heic',
        pdf: 'application/pdf',
      }
      const mime = mimeMap[ext] ?? 'image/png'
      const dataUrl = `data:${mime};base64,${readResult.data}`

      setOcrProgress({ active: true, progress: 10, message: 'Starting OCR...' })

      // Create Tesseract worker with progress tracking
      const worker = await createWorker('eng', 1, {
        logger: (info: { status: string; progress: number }) => {
          if (info.status === 'recognizing text') {
            const pct = Math.round(10 + info.progress * 85)
            setOcrProgress({
              active: true,
              progress: pct,
              message: `Recognizing text... ${Math.round(info.progress * 100)}%`,
            })
          }
        },
      })

      try {
        const { data } = await worker.recognize(dataUrl)
        const recognizedText = data.text

        setOcrProgress({ active: true, progress: 95, message: 'Parsing menu...' })

        if (!recognizedText || recognizedText.trim().length === 0) {
          throw new Error(
            'No text found in image. Make sure the image contains readable menu text.'
          )
        }

        // Parse OCR text into menu data
        const menuData = parseMenuText(recognizedText)

        const totalItems = menuData.sections.reduce(
          (sum, section) => sum + section.items.length,
          0
        )

        if (totalItems === 0) {
          throw new Error(
            'Could not extract any menu items from the image. The image may not contain recognizable menu content.'
          )
        }

        // Load parsed data into the menu store
        loadMenuData(menuData)
        markDirty()

        setOcrProgress({ active: true, progress: 100, message: 'Done!' })

        console.log(
          `Imported image via OCR: ${menuData.sections.length} sections, ${totalItems} items`
        )
      } finally {
        await worker.terminate()
      }
    } catch (error) {
      console.error('Image import error:', error)
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to import image: ${message}`)
    } finally {
      // Small delay so the "Done!" message is briefly visible before dismissal
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
