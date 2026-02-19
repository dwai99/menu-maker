import { useState } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import type { LogoData } from '@/models/menu'

export function LogoEditor() {
  const { menuData, setLogo } = useMenuStore()
  const { markDirty } = useUIStore()
  const [isUploading, setIsUploading] = useState(false)
  const [lockAspectRatio, setLockAspectRatio] = useState(true)

  const handleUploadClick = async () => {
    if (!window.electronAPI) return
    setIsUploading(true)
    try {
      const result = await window.electronAPI.showOpenImageDialog()

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return
      }

      const filePath = result.filePaths[0]
      const binaryResult = await window.electronAPI.readBinary(filePath)

      if (!binaryResult.success || !binaryResult.data) {
        console.error('Failed to read image file')
        return
      }

      const extension = filePath.split('.').pop()?.toLowerCase() || 'png'
      const dataUrl = `data:image/${extension};base64,${binaryResult.data}`

      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.height / img.width
        const defaultWidth = 150
        const calculatedHeight = Math.round(defaultWidth * aspectRatio)

        const newLogo: LogoData = {
          dataUrl,
          width: defaultWidth,
          height: calculatedHeight,
          x: 50,
          y: 0,
        }

        setLogo(newLogo)
        markDirty()
      }
      img.src = dataUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleWidthChange = (width: number) => {
    if (!menuData.logo) return
    const logo = menuData.logo

    const img = new Image()
    img.onload = () => {
      const aspectRatio = img.height / img.width
      const calculatedHeight = Math.round(width * aspectRatio)

      setLogo({ ...logo, width, height: calculatedHeight })
      markDirty()
    }
    img.src = logo.dataUrl
  }

  const handleHeightChange = (height: number) => {
    if (!menuData.logo) return
    if (lockAspectRatio) {
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.width / img.height
        const calculatedWidth = Math.round(height * aspectRatio)
        setLogo({ ...menuData.logo!, width: calculatedWidth, height })
        markDirty()
      }
      img.src = menuData.logo.dataUrl
      return
    }
    setLogo({ ...menuData.logo, height })
    markDirty()
  }

  const handleXChange = (x: number) => {
    if (!menuData.logo) return
    setLogo({ ...menuData.logo, x: Math.max(0, Math.min(100, x)) })
    markDirty()
  }

  const handleYChange = (y: number) => {
    if (!menuData.logo) return
    setLogo({ ...menuData.logo, y: Math.max(0, Math.min(100, y)) })
    markDirty()
  }

  const handleRemoveLogo = () => {
    setLogo(undefined)
    markDirty()
  }

  if (!menuData.logo) {
    return (
      <div className="flex flex-col h-full bg-neutral-50">
        <div className="p-4 border-b border-neutral-200 bg-white">
          <h2 className="text-sm font-semibold text-neutral-700">Logo</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg text-center w-full">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-neutral-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-neutral-700 mb-2">Upload Logo</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Add a logo to your menu. Drag it in the preview to position.
            </p>
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Choose Image'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="p-4 border-b border-neutral-200 bg-white">
        <h2 className="text-sm font-semibold text-neutral-700">Logo</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Logo Preview */}
        <div className="p-4 border-b border-neutral-200 bg-white">
          <label className="block text-xs font-medium text-neutral-500 mb-2">Preview</label>
          <div className="flex justify-center items-center bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <img
              src={menuData.logo.dataUrl}
              alt="Logo preview"
              style={{
                width: `${menuData.logo.width}px`,
                height: `${menuData.logo.height}px`,
              }}
              className="object-contain"
            />
          </div>
        </div>

        {/* Size Controls */}
        <div className="p-4 border-b border-neutral-200 bg-white">
          <label className="block text-xs font-medium text-neutral-500 mb-2">Size</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="logo-width" className="block text-xs text-neutral-400 mb-1">Width (px)</label>
              <input
                id="logo-width"
                type="number"
                min={20}
                max={600}
                step={10}
                value={menuData.logo.width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="logo-height" className="block text-xs text-neutral-400 mb-1">Height (px)</label>
              <input
                id="logo-height"
                type="number"
                min={20}
                max={600}
                step={10}
                value={menuData.logo.height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lockAspectRatio}
              onChange={(e) => setLockAspectRatio(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-xs text-neutral-600">Lock aspect ratio</span>
          </label>
          <p className="text-xs text-neutral-400 mt-1">Hold Shift while dragging corners in preview to constrain</p>
        </div>

        {/* Position Controls */}
        <div className="p-4 border-b border-neutral-200 bg-white">
          <label className="block text-xs font-medium text-neutral-500 mb-2">Position (% of content area)</label>
          <p className="text-xs text-neutral-400 mb-3">Drag the logo in the preview, or set values here.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="logo-x" className="block text-xs text-neutral-400 mb-1">X (%)</label>
              <input
                id="logo-x"
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(menuData.logo.x)}
                onChange={(e) => handleXChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="logo-y" className="block text-xs text-neutral-400 mb-1">Y (%)</label>
              <input
                id="logo-y"
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(menuData.logo.y)}
                onChange={(e) => handleYChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white">
          <div className="flex gap-2">
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex-1 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Replace
            </button>
            <button
              onClick={handleRemoveLogo}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
