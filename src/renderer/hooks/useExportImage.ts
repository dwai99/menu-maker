import { useCallback } from 'react'
import { toPng, toJpeg } from 'html-to-image'
import { useLayoutStore } from '@/stores/layout-store'
import { PAGE_SIZES } from '@/models/layout'
import type { PrintMarks } from '@/models/layout'

export interface ExportImageOptions {
    format: 'png' | 'jpeg'
    quality?: number    // 0-1 for JPEG, ignored for PNG
    scale?: number      // multiplier: 1 = 96dpi, 2 = 192dpi, etc.
}

/**
 * Draw crop marks and registration marks onto a canvas containing the captured page image.
 * Returns a new data URL with the marks composited.
 */
function composePrintMarks(
    capturedDataUrl: string,
    pageWidthPx: number,
    pageHeightPx: number,
    printMarks: PrintMarks,
    scale: number,
    format: 'png' | 'jpeg',
    quality: number,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const bleedPx = Math.round(printMarks.bleed * 96 * scale)
            const totalW = pageWidthPx + bleedPx * 2
            const totalH = pageHeightPx + bleedPx * 2

            const canvas = document.createElement('canvas')
            canvas.width = totalW
            canvas.height = totalH
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('Canvas context unavailable')); return }

            // Fill background white
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, totalW, totalH)

            // Draw the captured image centered in the bleed area
            ctx.drawImage(img, bleedPx, bleedPx, pageWidthPx, pageHeightPx)

            const markLen = Math.round(0.25 * 96 * scale) // 0.25" mark length
            const markOffset = Math.round(0.0625 * 96 * scale) // 1/16" gap from page edge
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = Math.max(1, scale * 0.5)

            if (printMarks.showCropMarks) {
                // Corner crop marks — L-shaped lines at each corner
                const corners = [
                    { x: bleedPx, y: bleedPx },                        // top-left
                    { x: bleedPx + pageWidthPx, y: bleedPx },         // top-right
                    { x: bleedPx, y: bleedPx + pageHeightPx },        // bottom-left
                    { x: bleedPx + pageWidthPx, y: bleedPx + pageHeightPx }, // bottom-right
                ]

                for (const { x, y } of corners) {
                    const isLeft = x === bleedPx
                    const isTop = y === bleedPx

                    // Horizontal mark
                    ctx.beginPath()
                    const hStart = isLeft ? x - markLen - markOffset : x + markOffset
                    const hEnd = isLeft ? x - markOffset : x + markLen + markOffset
                    ctx.moveTo(hStart, y)
                    ctx.lineTo(hEnd, y)
                    ctx.stroke()

                    // Vertical mark
                    ctx.beginPath()
                    const vStart = isTop ? y - markLen - markOffset : y + markOffset
                    const vEnd = isTop ? y - markOffset : y + markLen + markOffset
                    ctx.moveTo(x, vStart)
                    ctx.lineTo(x, vEnd)
                    ctx.stroke()
                }
            }

            if (printMarks.showRegistrationMarks) {
                // Registration marks at edge midpoints (crosshair + circle)
                const midpoints = [
                    { x: bleedPx + pageWidthPx / 2, y: bleedPx / 2 },                    // top center
                    { x: bleedPx + pageWidthPx / 2, y: bleedPx + pageHeightPx + bleedPx / 2 }, // bottom center
                    { x: bleedPx / 2, y: bleedPx + pageHeightPx / 2 },                    // left center
                    { x: bleedPx + pageWidthPx + bleedPx / 2, y: bleedPx + pageHeightPx / 2 }, // right center
                ]

                const crossSize = Math.round(0.125 * 96 * scale)
                const circleR = Math.round(0.0625 * 96 * scale)

                for (const { x, y } of midpoints) {
                    // Crosshair
                    ctx.beginPath()
                    ctx.moveTo(x - crossSize, y)
                    ctx.lineTo(x + crossSize, y)
                    ctx.stroke()

                    ctx.beginPath()
                    ctx.moveTo(x, y - crossSize)
                    ctx.lineTo(x, y + crossSize)
                    ctx.stroke()

                    // Circle
                    ctx.beginPath()
                    ctx.arc(x, y, circleR, 0, Math.PI * 2)
                    ctx.stroke()
                }
            }

            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
            resolve(canvas.toDataURL(mimeType, format === 'jpeg' ? quality : undefined))
        }
        img.onerror = () => reject(new Error('Failed to load captured image'))
        img.src = capturedDataUrl
    })
}

export const useExportImage = () => {
    const { pageLayout } = useLayoutStore()

    const exportImage = useCallback(async (options: ExportImageOptions = { format: 'png' }) => {
        if (!window.electronAPI) return
        const { format, quality = 0.92, scale = 2 } = options

        try {
            // Find the page preview element
            const element = document.getElementById('page-preview')
            if (!element) {
                alert('Could not find page preview element')
                return
            }

            // Calculate full-resolution dimensions
            const pageDims = PAGE_SIZES[pageLayout.pageSize]
            const pageWidthInches = pageLayout.orientation === 'portrait' ? pageDims.width : pageDims.height
            const pageHeightInches = pageLayout.orientation === 'portrait' ? pageDims.height : pageDims.width
            const DPI = 96
            const fullWidth = Math.round(pageWidthInches * DPI * scale)
            const fullHeight = Math.round(pageHeightInches * DPI * scale)

            const captureOptions = {
                width: fullWidth,
                height: fullHeight,
                style: {
                    transform: 'none',
                    transformOrigin: 'top left',
                    width: `${pageWidthInches * DPI}px`,
                    height: `${pageHeightInches * DPI}px`,
                },
                canvasWidth: fullWidth,
                canvasHeight: fullHeight,
                pixelRatio: 1,  // we handle scaling via canvasWidth/Height
                cacheBust: true,
            }

            // Hide editor-only elements (split badges, cont. labels) during capture
            const hideStyle = document.createElement('style')
            hideStyle.id = 'export-hide-editor-only'
            hideStyle.textContent = '[data-editor-only] { display: none !important; }'
            document.head.appendChild(hideStyle)

            let dataUrl: string

            try {
                if (format === 'jpeg') {
                    dataUrl = await toJpeg(element, { ...captureOptions, quality })
                } else {
                    dataUrl = await toPng(element, captureOptions)
                }
            } finally {
                hideStyle.remove()
            }

            // Composite print marks if enabled
            const pm = pageLayout.printMarks
            if (pm && (pm.showCropMarks || pm.showRegistrationMarks)) {
                dataUrl = await composePrintMarks(dataUrl, fullWidth, fullHeight, pm, scale, format, quality)
            }

            // Send the base64 data to main process for saving
            const result = await window.electronAPI.saveImageData({
                dataUrl,
                format,
                defaultName: `menu.${format === 'jpeg' ? 'jpg' : 'png'}`,
            })

            if (result.success && result.filePath) {
                alert(`Image exported to ${result.filePath}`)
            } else if (result.error && result.error !== 'Canceled') {
                alert(`Failed to export image: ${result.error}`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            alert(`Failed to export image: ${errorMessage}`)
        }
    }, [pageLayout.pageSize, pageLayout.orientation, pageLayout.printMarks])

    const exportAllPages = useCallback(async (options: ExportImageOptions = { format: 'png' }) => {
        if (!window.electronAPI) return
        const { format, quality = 0.92, scale = 2 } = options

        try {
            const pages = document.querySelectorAll('.print-page')
            if (pages.length <= 1) {
                // Single page — use regular export
                return exportImage(options)
            }

            // Ask user for a directory
            const dirResult = await window.electronAPI.showSaveDirectoryDialog()
            if (dirResult.canceled || !dirResult.directoryPath) return

            const pageDims = PAGE_SIZES[pageLayout.pageSize]
            const pageWidthInches = pageLayout.orientation === 'portrait' ? pageDims.width : pageDims.height
            const pageHeightInches = pageLayout.orientation === 'portrait' ? pageDims.height : pageDims.width
            const DPI = 96
            const fullWidth = Math.round(pageWidthInches * DPI * scale)
            const fullHeight = Math.round(pageHeightInches * DPI * scale)

            const captureOptions = {
                width: fullWidth,
                height: fullHeight,
                style: {
                    transform: 'none',
                    transformOrigin: 'top left',
                    width: `${pageWidthInches * DPI}px`,
                    height: `${pageHeightInches * DPI}px`,
                },
                canvasWidth: fullWidth,
                canvasHeight: fullHeight,
                pixelRatio: 1,
                cacheBust: true,
            }

            // Hide editor-only elements during capture
            const hideStyle = document.createElement('style')
            hideStyle.id = 'export-hide-editor-only'
            hideStyle.textContent = '[data-editor-only] { display: none !important; }'
            document.head.appendChild(hideStyle)

            let exported = 0
            try {
                for (let i = 0; i < pages.length; i++) {
                    const pageEl = pages[i] as HTMLElement
                    let dataUrl: string
                    if (format === 'jpeg') {
                        dataUrl = await toJpeg(pageEl, { ...captureOptions, quality })
                    } else {
                        dataUrl = await toPng(pageEl, captureOptions)
                    }

                    // Composite print marks if enabled
                    const pm = pageLayout.printMarks
                    if (pm && (pm.showCropMarks || pm.showRegistrationMarks)) {
                        dataUrl = await composePrintMarks(dataUrl, fullWidth, fullHeight, pm, scale, format, quality)
                    }

                    const ext = format === 'jpeg' ? 'jpg' : 'png'
                    const filePath = `${dirResult.directoryPath}/menu-${i + 1}.${ext}`
                    const saveResult = await window.electronAPI.saveImageToPath({ dataUrl, filePath })
                    if (saveResult.success) exported++
                }
            } finally {
                hideStyle.remove()
            }

            alert(`Exported ${exported} page${exported !== 1 ? 's' : ''} to ${dirResult.directoryPath}`)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            alert(`Failed to export images: ${errorMessage}`)
        }
    }, [pageLayout.pageSize, pageLayout.orientation, pageLayout.printMarks, exportImage])

    return { exportImage, exportAllPages }
}
