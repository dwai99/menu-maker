import React, { useState, useCallback, useRef } from 'react'
import { parseCsvMenu, generateSampleCsv } from '@/utils/parse-csv'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'

interface CsvImportDialogProps {
  open: boolean
  onClose: () => void
}

export function CsvImportDialog({ open, onClose }: CsvImportDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { appendSections, loadMenuData, menuData } = useMenuStore()
  const { markDirty } = useUIStore()

  const parsed = csvText.trim() ? parseCsvMenu(csvText) : null

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '')
    }
    reader.readAsText(file)
  }, [])

  const handleImport = useCallback(() => {
    if (!parsed || parsed.sections.length === 0) return
    if (mode === 'replace') {
      loadMenuData({
        ...menuData,
        sections: parsed.sections,
      })
    } else {
      appendSections(parsed.sections)
    }
    markDirty()
    setCsvText('')
    onClose()
  }, [parsed, mode, appendSections, loadMenuData, menuData, markDirty, onClose])

  const handleDownloadSample = useCallback(() => {
    const blob = new Blob([generateSampleCsv()], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'menu-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">Import from CSV</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-neutral-500">
            Paste CSV text or upload a file. Required column: <strong>Item</strong>. Optional: <strong>Section</strong>, <strong>Description</strong>, <strong>Price</strong>, <strong>Dietary</strong>, <strong>Badges</strong>, <strong>Tags</strong>.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Upload .csv
            </button>
            <button
              onClick={handleDownloadSample}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Download Sample
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Section,Item,Description,Price&#10;Appetizers,,,&#10;,Bruschetta,Toasted bread with tomatoes,8.99"
            className="w-full h-40 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          />

          {/* Preview */}
          {parsed && (
            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
              {parsed.errors.length > 0 ? (
                <div className="text-xs text-red-600">
                  {parsed.errors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-neutral-700 mb-2">
                    Preview: {parsed.sections.length} section{parsed.sections.length !== 1 ? 's' : ''}, {parsed.itemCount} item{parsed.itemCount !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {parsed.sections.map((section) => (
                      <div key={section.id}>
                        <p className="text-xs font-semibold text-neutral-800">{section.title}</p>
                        {section.items.map((item) => (
                          <p key={item.id} className="text-xs text-neutral-500 pl-3">
                            {item.name}{item.price ? ` — $${item.price}` : ''}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mode selector */}
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="csv-mode"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="w-3.5 h-3.5 text-amber-600"
              />
              <span className="text-xs text-neutral-700">Append to existing sections</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="csv-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="w-3.5 h-3.5 text-amber-600"
              />
              <span className="text-xs text-neutral-700">Replace all sections</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parsed || parsed.sections.length === 0 || parsed.errors.length > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import {parsed && parsed.itemCount > 0 ? `(${parsed.itemCount} items)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
