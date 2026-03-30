import { useState, useEffect } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import { useLayoutStore } from '@/stores/layout-store'
import { createTextFrame } from '@/models/menu'
import type { TextFrame, TextFrameStyle } from '@/models/menu'
import { getAllFontFamilies } from '@/fonts/registry'

export function TextFrameList() {
  const { menuData, addTextFrame, updateTextFrame, updateTextFrameStyle, removeTextFrame } = useMenuStore()
  const { markDirty, selectedTextFrameId, selectTextFrame } = useUIStore()
  const pageLayout = useLayoutStore((s) => s.pageLayout)
  const [fontFamilies, setFontFamilies] = useState<string[]>([])

  useEffect(() => {
    setFontFamilies(getAllFontFamilies())
  }, [])

  const frames = menuData.textFrames || []
  const totalPages = Math.max(1, pageLayout.pages?.length ?? 1)

  const handleAdd = () => {
    const frame = createTextFrame()
    addTextFrame(frame)
    selectTextFrame(frame.id)
    markDirty()
  }

  const handleUpdate = (id: string, updates: Partial<TextFrame>) => {
    updateTextFrame(id, updates)
    markDirty()
  }

  const handleStyleUpdate = (id: string, updates: Partial<TextFrameStyle>) => {
    updateTextFrameStyle(id, updates)
    markDirty()
  }

  const handleRemove = (id: string) => {
    removeTextFrame(id)
    if (selectedTextFrameId === id) selectTextFrame(null)
    markDirty()
  }

  if (frames.length === 0) {
    return (
      <div className="p-4">
        <div className="p-6 border-2 border-dashed border-neutral-300 rounded-lg text-center">
          <svg
            className="mx-auto h-10 w-10 text-neutral-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-xs text-neutral-500 mb-3">
            Add text boxes for promotions, hours, callouts, or any custom text on your menu.
          </p>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Add Text Box
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {frames.map((frame, index) => {
        const isSelected = selectedTextFrameId === frame.id
        const label = frame.label || `Text ${index + 1}`
        const preview = frame.content
          ? frame.content.length > 30 ? frame.content.slice(0, 30) + '...' : frame.content
          : 'Empty'

        return (
          <div
            key={frame.id}
            className={`border-b border-neutral-200 ${isSelected ? 'bg-amber-50' : 'bg-white'}`}
          >
            {/* Row: icon + label + remove */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-neutral-50"
              onClick={() => selectTextFrame(isSelected ? null : frame.id)}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded border border-neutral-200 bg-neutral-50 flex-shrink-0 text-neutral-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-700 truncate">{label}</p>
                <p className="text-xs text-neutral-400 truncate">
                  {preview}
                  {frame.layer === 'behind' ? ' \u00B7 Behind' : ' \u00B7 Front'}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(frame.id) }}
                className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove text box"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Expanded controls */}
            {isSelected && (
              <div className="px-3 pb-3 space-y-3">
                {/* Content */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Content</label>
                  <textarea
                    value={frame.content}
                    placeholder="Enter text..."
                    onChange={(e) => handleUpdate(frame.id, { content: e.target.value })}
                    rows={3}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={frame.label || ''}
                    placeholder={`Text ${index + 1}`}
                    onChange={(e) => handleUpdate(frame.id, { label: e.target.value || undefined })}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Font family + size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Font</label>
                    <select
                      value={frame.style.fontFamily}
                      onChange={(e) => handleStyleUpdate(frame.id, { fontFamily: e.target.value })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {fontFamilies.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Size (pt)</label>
                    <input
                      type="number"
                      min={6}
                      max={72}
                      step={1}
                      value={frame.style.fontSize}
                      onChange={(e) => handleStyleUpdate(frame.id, { fontSize: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Weight + Style + Align */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStyleUpdate(frame.id, { fontWeight: frame.style.fontWeight === 700 ? 400 : 700 })}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-md border transition-colors ${
                      frame.style.fontWeight === 700
                        ? 'bg-amber-50 text-amber-800 border-amber-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    onClick={() => handleStyleUpdate(frame.id, { fontStyle: frame.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`flex-1 px-2 py-1.5 text-xs italic rounded-md border transition-colors ${
                      frame.style.fontStyle === 'italic'
                        ? 'bg-amber-50 text-amber-800 border-amber-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    onClick={() => handleStyleUpdate(frame.id, { textAlign: 'left' })}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                      frame.style.textAlign === 'left'
                        ? 'bg-amber-50 text-amber-800 border-amber-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    title="Align left"
                  >
                    L
                  </button>
                  <button
                    onClick={() => handleStyleUpdate(frame.id, { textAlign: 'center' })}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                      frame.style.textAlign === 'center'
                        ? 'bg-amber-50 text-amber-800 border-amber-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    title="Align center"
                  >
                    C
                  </button>
                  <button
                    onClick={() => handleStyleUpdate(frame.id, { textAlign: 'right' })}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                      frame.style.textAlign === 'right'
                        ? 'bg-amber-50 text-amber-800 border-amber-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    title="Align right"
                  >
                    R
                  </button>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={frame.style.color}
                        onChange={(e) => handleStyleUpdate(frame.id, { color: e.target.value })}
                        className="w-8 h-8 border border-neutral-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={frame.style.color}
                        onChange={(e) => handleStyleUpdate(frame.id, { color: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={frame.style.backgroundColor === 'transparent' ? '#ffffff' : frame.style.backgroundColor}
                        onChange={(e) => handleStyleUpdate(frame.id, { backgroundColor: e.target.value })}
                        className="w-8 h-8 border border-neutral-300 rounded cursor-pointer"
                      />
                      <button
                        onClick={() => handleStyleUpdate(frame.id, { backgroundColor: 'transparent' })}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                          frame.style.backgroundColor === 'transparent'
                            ? 'bg-amber-50 text-amber-800 border-amber-600'
                            : 'bg-white text-neutral-500 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        None
                      </button>
                    </div>
                  </div>
                </div>

                {/* Border */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Border</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={frame.style.borderWidth}
                      onChange={(e) => handleStyleUpdate(frame.id, { borderWidth: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Color</label>
                    <input
                      type="color"
                      value={frame.style.borderColor === 'transparent' ? '#000000' : frame.style.borderColor}
                      onChange={(e) => handleStyleUpdate(frame.id, { borderColor: e.target.value })}
                      className="w-full h-[34px] border border-neutral-300 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Radius</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={frame.style.borderRadius}
                      onChange={(e) => handleStyleUpdate(frame.id, { borderRadius: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Layer toggle */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Layer</label>
                  <div className="flex bg-neutral-200 rounded-md p-0.5 gap-px">
                    <button
                      onClick={() => handleUpdate(frame.id, { layer: 'behind' })}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        frame.layer === 'behind'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Behind
                    </button>
                    <button
                      onClick={() => handleUpdate(frame.id, { layer: 'front' })}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        frame.layer === 'front'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Front
                    </button>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">
                    Opacity: {frame.opacity}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={frame.opacity}
                    onChange={(e) => handleUpdate(frame.id, { opacity: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Width (px)</label>
                    <input
                      type="number"
                      min={40}
                      max={800}
                      step={10}
                      value={frame.width}
                      onChange={(e) => handleUpdate(frame.id, { width: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Height (px)</label>
                    <input
                      type="number"
                      min={24}
                      max={800}
                      step={10}
                      value={frame.height}
                      onChange={(e) => handleUpdate(frame.id, { height: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Page selector (multi-page only) */}
                {totalPages > 1 && (
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Page</label>
                    <select
                      value={frame.pageIndex}
                      onChange={(e) => handleUpdate(frame.id, { pageIndex: Number(e.target.value) })}
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
          onClick={handleAdd}
          className="w-full px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
        >
          Add Text Box
        </button>
      </div>
    </div>
  )
}
