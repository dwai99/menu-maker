import { useEffect, useState, useCallback } from 'react'
import { useVersionHistory } from '@/hooks/useVersionHistory'
import type { VersionEntry } from '@/models/version'

// ---------------------------------------------------------------------------
// Relative-time formatter (no external deps)
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`

  const pad = (n: number) => String(n).padStart(2, '0')
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return `Yesterday at ${timeStr}`
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()} at ${timeStr}`
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Restore this version?</h3>
        <p className="text-xs text-neutral-600 mb-5">
          Current unsaved changes will be lost. A snapshot of your current state will be saved before restoring.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Version row
// ---------------------------------------------------------------------------

interface VersionRowProps {
  entry: VersionEntry
  onRestoreClick: (entry: VersionEntry) => void
  isRestoring: boolean
}

function VersionRow({ entry, onRestoreClick, isRestoring }: VersionRowProps) {
  const date = new Date(entry.timestamp)
  const relTime = formatRelativeTime(date)

  const pad = (n: number) => String(n).padStart(2, '0')
  const absoluteTime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors group">
      <div className="flex-1 min-w-0 mr-3">
        <div className="text-xs font-medium text-neutral-800 truncate" title={absoluteTime}>
          {relTime}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5 truncate">
          {entry.summary || 'Save'}
        </div>
      </div>
      <button
        onClick={() => onRestoreClick(entry)}
        disabled={isRestoring}
        className="shrink-0 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Restore version from ${relTime}`}
      >
        Restore
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface VersionHistoryPanelProps {
  onClose: () => void
}

export default function VersionHistoryPanel({ onClose }: VersionHistoryPanelProps) {
  const { versions, isLoading, loadVersions, restoreVersion } = useVersionHistory()
  const [pendingEntry, setPendingEntry] = useState<VersionEntry | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Load versions when panel opens
  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleRestoreClick = useCallback((entry: VersionEntry) => {
    setPendingEntry(entry)
  }, [])

  const handleConfirmRestore = useCallback(async () => {
    if (!pendingEntry) return
    setIsRestoring(true)
    setPendingEntry(null)
    try {
      await restoreVersion(pendingEntry.id)
    } finally {
      setIsRestoring(false)
      onClose()
    }
  }, [pendingEntry, restoreVersion, onClose])

  const handleCancelRestore = useCallback(() => {
    setPendingEntry(null)
  }, [])

  // Sorted most-recent first (entries from the hook are already sorted,
  // but we defensively re-sort here)
  const sorted = [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <>
      {/* Backdrop — clicking outside closes the panel */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className="fixed top-0 right-0 h-full w-[350px] bg-white border-l border-neutral-200 shadow-xl z-50 flex flex-col"
        role="dialog"
        aria-label="Version History"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-900">Version History</h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors rounded-md hover:bg-neutral-100"
            aria-label="Close version history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xs text-neutral-400">Loading versions...</div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <svg className="w-8 h-8 text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium text-neutral-500">No versions saved yet</p>
              <p className="text-xs text-neutral-400 mt-1">Save your file to create the first version</p>
            </div>
          ) : (
            sorted.map((entry) => (
              <VersionRow
                key={entry.id}
                entry={entry}
                onRestoreClick={handleRestoreClick}
                isRestoring={isRestoring}
              />
            ))
          )}
        </div>

        {/* Footer note */}
        <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
          <p className="text-xs text-neutral-400">
            Versions are saved automatically when you save your file
          </p>
        </div>
      </div>

      {/* Confirmation dialog */}
      {pendingEntry && (
        <ConfirmDialog
          onConfirm={handleConfirmRestore}
          onCancel={handleCancelRestore}
        />
      )}
    </>
  )
}
