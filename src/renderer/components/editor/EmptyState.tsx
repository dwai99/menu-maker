import React, { useEffect, useState } from 'react'

interface EmptyStateProps {
  onAddSection: () => void
  onShowTemplates: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddSection, onShowTemplates }) => {
  const [recentFiles, setRecentFiles] = useState<string[]>([])

  useEffect(() => {
    window.electronAPI?.getRecentFiles?.().then((files) => {
      if (files) setRecentFiles(files)
    }).catch(() => {})
  }, [])

  const handleOpenRecent = (filePath: string) => {
    window.dispatchEvent(new CustomEvent('menu-maker:open-recent', { detail: { filePath } }))
  }

  /** Extract just the filename without extension */
  const displayName = (fp: string) => {
    const name = fp.split('/').pop()?.split('\\').pop() ?? fp
    return name.replace(/\.menu$/, '')
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4">&#127860;</div>
      <h2 className="text-lg font-semibold text-neutral-800 mb-2">
        Your menu is empty
      </h2>
      <p className="text-sm text-neutral-500 mb-6 max-w-xs">
        Start from scratch or pick a template to get going quickly.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={onAddSection}
          className="px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
        >
          + Add Section
        </button>
        <button
          onClick={onShowTemplates}
          className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
        >
          Browse Templates
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('menu-maker:import-image'))}
          className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Import from Photo
        </button>
      </div>

      {/* Recent Files */}
      {recentFiles.length > 0 && (
        <div className="mt-8 w-full max-w-xs">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Recent Files
          </h3>
          <div className="space-y-1">
            {recentFiles.map((fp) => (
              <button
                key={fp}
                onClick={() => handleOpenRecent(fp)}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-amber-50 hover:text-amber-800 rounded-md transition-colors truncate"
                title={fp}
              >
                {displayName(fp)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-xs text-neutral-400 space-y-1">
        <p><kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px]">Cmd+D</kbd> Duplicate selected</p>
        <p><kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px]">Cmd+Z</kbd> Undo</p>
        <p><kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px]">Esc</kbd> Clear selection</p>
      </div>
    </div>
  )
}
