import { useState } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { useLayoutStore } from '@/stores/layout-store'
import { createPageImage } from '@/models/menu'
import type { PageImage } from '@/models/menu'

export function PageImageList() {
  const { menuData, addPageImage, updatePageImage, removePageImage } = useMenuStore()
  const { markDirty, selectedPageImageId, selectPageImage } = useUIStore()
  const pageLayout = useLayoutStore((s) => s.pageLayout)
  const [isUploading, setIsUploading] = useState(false)

  const images = menuData.pageImages || []

  // Estimate total pages from layout pages or default to 1
  const totalPages = Math.max(1, pageLayout.pages?.length ?? 1)

  const handleUploadClick = async () => {
    if (!window.electronAPI) return
    setIsUploading(true)
    try {
      const result = await window.electronAPI.showOpenImageDialog()
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) return

      const filePath = result.filePaths[0]
      const binaryResult = await window.electronAPI.readBinary(filePath)
      if (!binaryResult.success || !binaryResult.data) return

      const extension = filePath.split('.').pop()?.toLowerCase() || 'png'
      const dataUrl = `data:image/${extension};base64,${binaryResult.data}`

      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.height / img.width
        const defaultWidth = 150
        const calculatedHeight = Math.round(defaultWidth * aspectRatio)
        const pageImage = createPageImage(dataUrl, defaultWidth, calculatedHeight)
        addPageImage(pageImage)
        selectPageImage(pageImage.id)
        markDirty()
      }
      img.src = dataUrl
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdate = (id: string, updates: Partial<PageImage>) => {
    updatePageImage(id, updates)
    markDirty()
  }

  const handleRemove = (id: string) => {
    removePageImage(id)
    if (selectedPageImageId === id) selectPageImage(null)
    markDirty()
  }

  if (images.length === 0) {
    return (
      <div className="p-4">
        <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg text-center">
          <svg
            className="mx-auto h-10 w-10 text-neutral-400 mb-3"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-xs text-neutral-500 mb-3">
            Add decorative images, photos, or watermarks to your menu pages.
          </p>
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Add Image'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Image list */}
      {images.map((image, index) => {
        const isSelected = selectedPageImageId === image.id
        const label = image.label || `Image ${index + 1}`

        return (
          <div
            key={image.id}
            className={`border-b border-neutral-200 ${isSelected ? 'bg-amber-50' : 'bg-white'}`}
          >
            {/* Row: thumbnail + label + remove */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-neutral-50"
              onClick={() => selectPageImage(isSelected ? null : image.id)}
            >
              <img
                src={image.dataUrl}
                alt={label}
                className="w-12 h-12 object-cover rounded border border-neutral-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-700 truncate">{label}</p>
                <p className="text-xs text-neutral-400">
                  {image.width}x{image.height}px
                  {image.layer === 'behind' ? ' \u00B7 Behind' : ' \u00B7 Front'}
                  {image.opacity < 100 ? ` \u00B7 ${image.opacity}%` : ''}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(image.id) }}
                className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Expanded controls when selected */}
            {isSelected && (
              <div className="px-3 pb-3 space-y-3">
                {/* Label */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={image.label || ''}
                    placeholder={`Image ${index + 1}`}
                    onChange={(e) => handleUpdate(image.id, { label: e.target.value || undefined })}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Layer toggle */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Layer</label>
                  <div className="flex bg-neutral-200 rounded-md p-0.5 gap-px">
                    <button
                      onClick={() => handleUpdate(image.id, { layer: 'behind' })}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        image.layer === 'behind'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Behind
                    </button>
                    <button
                      onClick={() => handleUpdate(image.id, { layer: 'front' })}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        image.layer === 'front'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Front
                    </button>
                  </div>
                </div>

                {/* Opacity slider */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Opacity: {image.opacity}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={image.opacity}
                    onChange={(e) => handleUpdate(image.id, { opacity: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Width (px)</label>
                    <input
                      type="number"
                      min={20}
                      max={800}
                      step={10}
                      value={image.width}
                      onChange={(e) => {
                        const w = Number(e.target.value)
                        const aspectRatio = image.height / image.width
                        handleUpdate(image.id, { width: w, height: Math.round(w * aspectRatio) })
                      }}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Height (px)</label>
                    <input
                      type="number"
                      min={20}
                      max={800}
                      step={10}
                      value={image.height}
                      onChange={(e) => handleUpdate(image.id, { height: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">X (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(image.x)}
                      onChange={(e) => handleUpdate(image.id, { x: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Y (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(image.y)}
                      onChange={(e) => handleUpdate(image.id, { y: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Page selector (multi-page only) */}
                {totalPages > 1 && (
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Page</label>
                    <select
                      value={image.pageIndex}
                      onChange={(e) => handleUpdate(image.id, { pageIndex: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <option key={i} value={i}>Page {i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add button */}
      <div className="p-3">
        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="w-full px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Add Image'}
        </button>
      </div>
    </div>
  )
}
