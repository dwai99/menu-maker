import { useMemo } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useMenuStore } from '@/stores/menu-store'
import { computeMenuDiff, isDiffEmpty } from '@/utils/menu-diff'

interface WhatChangedModalProps {
  onClose: () => void
}

export function WhatChangedModal({ onClose }: WhatChangedModalProps) {
  const lastSavedMenuData = useUIStore((s) => s.lastSavedMenuData)
  const currentFilePath = useUIStore((s) => s.currentFilePath)
  const menuData = useMenuStore((s) => s.menuData)

  const diff = useMemo(() => {
    if (!lastSavedMenuData) return null
    return computeMenuDiff(lastSavedMenuData, menuData)
  }, [lastSavedMenuData, menuData])

  const empty = diff ? isDiffEmpty(diff) : false

  const totalChanges = diff
    ? diff.addedItems.length +
      diff.removedItems.length +
      diff.priceChanges.length +
      diff.addedSections.length +
      diff.removedSections.length
    : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-semibold text-neutral-800">What Changed</h2>
            {lastSavedMenuData && !empty && (
              <p className="text-xs text-neutral-400 mt-0.5">
                {totalChanges} change{totalChanges !== 1 ? 's' : ''} since last save
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-md hover:bg-neutral-100"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Never saved */}
          {!currentFilePath && !lastSavedMenuData && (
            <EmptyState
              icon="save"
              message="Save your menu first to track changes."
            />
          )}

          {/* Saved but no baseline yet (shouldn't normally occur after first save, but guard) */}
          {currentFilePath && !lastSavedMenuData && (
            <EmptyState
              icon="save"
              message="Save your menu to establish a baseline for tracking changes."
            />
          )}

          {/* Has baseline — no changes */}
          {lastSavedMenuData && empty && (
            <EmptyState
              icon="check"
              message="No changes since last save."
            />
          )}

          {/* Has baseline — show changes */}
          {lastSavedMenuData && diff && !empty && (
            <div className="space-y-4">
              {/* Added sections */}
              {diff.addedSections.length > 0 && (
                <ChangeGroup title="New Sections">
                  {diff.addedSections.map((title) => (
                    <ChangeRow
                      key={`section-add-${title}`}
                      color="green"
                      label="Added section"
                      primary={title}
                    />
                  ))}
                </ChangeGroup>
              )}

              {/* Removed sections */}
              {diff.removedSections.length > 0 && (
                <ChangeGroup title="Removed Sections">
                  {diff.removedSections.map((title) => (
                    <ChangeRow
                      key={`section-rm-${title}`}
                      color="red"
                      label="Removed section"
                      primary={title}
                    />
                  ))}
                </ChangeGroup>
              )}

              {/* Added items */}
              {diff.addedItems.length > 0 && (
                <ChangeGroup title="New Items">
                  {diff.addedItems.map((item) => (
                    <ChangeRow
                      key={`add-${item.sectionTitle}-${item.itemName}`}
                      color="green"
                      label="Added"
                      primary={item.itemName}
                      secondary={item.sectionTitle}
                    />
                  ))}
                </ChangeGroup>
              )}

              {/* Removed items */}
              {diff.removedItems.length > 0 && (
                <ChangeGroup title="Removed Items">
                  {diff.removedItems.map((item) => (
                    <ChangeRow
                      key={`rm-${item.sectionTitle}-${item.itemName}`}
                      color="red"
                      label="Removed"
                      primary={item.itemName}
                      secondary={item.sectionTitle}
                    />
                  ))}
                </ChangeGroup>
              )}

              {/* Price changes */}
              {diff.priceChanges.length > 0 && (
                <ChangeGroup title="Price Changes">
                  {diff.priceChanges.map((item) => (
                    <ChangeRow
                      key={`price-${item.sectionTitle}-${item.itemName}`}
                      color="amber"
                      label="Price change"
                      primary={item.itemName}
                      secondary={item.sectionTitle}
                      detail={`${item.oldPrice || '—'} → ${item.newPrice || '—'}`}
                    />
                  ))}
                </ChangeGroup>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-amber-700 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ChangeGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

type RowColor = 'green' | 'red' | 'amber'

interface ChangeRowProps {
  color: RowColor
  label: string
  primary: string
  secondary?: string
  detail?: string
}

const colorMap: Record<RowColor, { dot: string; text: string; bg: string; border: string }> = {
  green: {
    dot: 'bg-green-500',
    text: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-100',
  },
  red: {
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  amber: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
}

function ChangeRow({ color, label, primary, secondary, detail }: ChangeRowProps) {
  const c = colorMap[color]
  return (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-semibold ${c.text}`}>{label}: </span>
        <span className="text-xs font-medium text-neutral-800">{primary}</span>
        {secondary && (
          <span className="text-xs text-neutral-400"> ({secondary})</span>
        )}
        {detail && (
          <span className={`block text-xs font-medium mt-0.5 ${c.text}`}>{detail}</span>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: 'save' | 'check'; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
        {icon === 'check' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 10l4 4 6-7" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 14v1a1 1 0 001 1h10a1 1 0 001-1v-1M13 5l-3-3-3 3M10 2v10" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  )
}
