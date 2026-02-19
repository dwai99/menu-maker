import { useEffect } from 'react'

interface ShortcutsOverlayProps {
  onClose: () => void
}

// Detect macOS so we show the ⌘ symbol instead of "Ctrl"
const isMac = navigator.platform.startsWith('Mac')
const mod = isMac ? '⌘' : 'Ctrl'

interface ShortcutRow {
  keys: string[]
  action: string
}

interface ShortcutGroup {
  heading: string
  shortcuts: ShortcutRow[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    heading: 'File',
    shortcuts: [
      { keys: [mod, 'N'], action: 'New document' },
      { keys: [mod, 'O'], action: 'Open file' },
      { keys: [mod, 'S'], action: 'Save' },
      { keys: [mod, '⇧', 'S'], action: 'Save as' },
    ],
  },
  {
    heading: 'Edit',
    shortcuts: [
      { keys: [mod, 'Z'], action: 'Undo' },
      { keys: [mod, '⇧', 'Z'], action: 'Redo' },
      { keys: [mod, 'D'], action: 'Duplicate selection' },
      { keys: ['Del / ⌫'], action: 'Delete selected section' },
      { keys: ['Esc'], action: 'Clear selection' },
    ],
  },
  {
    heading: 'View',
    shortcuts: [
      { keys: [mod, '1'], action: 'Editor only' },
      { keys: [mod, '2'], action: 'Split view' },
      { keys: [mod, '3'], action: 'Preview only' },
    ],
  },
  {
    heading: 'Import / Export',
    shortcuts: [
      { keys: [mod, '⇧', 'I'], action: 'Import from photo' },
      { keys: [mod, '⇧', 'H'], action: 'Version history' },
      { keys: [mod, '/'], action: 'Show this help' },
    ],
  },
]

function KbdKey({ label }: { label: string }) {
  // The ⌘ symbol gets the amber accent treatment
  const isModKey =
    label === '⌘' ||
    label === 'Ctrl' ||
    label === '⇧' ||
    label === 'Esc' ||
    label === 'Del / ⌫'

  return (
    <kbd
      className={`
        inline-flex items-center justify-center
        min-w-[1.75rem] px-2 py-0.5
        rounded text-xs font-semibold
        border shadow-sm select-none
        ${
          isModKey
            ? 'bg-amber-50 text-amber-700 border-amber-300'
            : 'bg-gray-100 text-gray-700 border-gray-300'
        }
      `}
    >
      {label}
    </kbd>
  )
}

function ShortcutRow({ keys, action }: ShortcutRow) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-4">
        <span className="flex items-center gap-1 flex-wrap">
          {keys.map((key, i) => (
            <KbdKey key={i} label={key} />
          ))}
        </span>
      </td>
      <td className="py-2 text-sm text-gray-700">{action}</td>
    </tr>
  )
}

export default function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-md p-1 hover:bg-gray-100"
            aria-label="Close shortcuts overlay"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">
                {group.heading}
              </h3>
              <table className="w-full">
                <tbody>
                  {group.shortcuts.map((shortcut, i) => (
                    <ShortcutRow key={i} keys={shortcut.keys} action={shortcut.action} />
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Press <KbdKey label={mod} /> <KbdKey label="/" /> or click outside to close
          </p>
        </div>
      </div>
    </div>
  )
}
