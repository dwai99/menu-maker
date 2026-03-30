import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import type { MenuItem, DietaryIcon, ItemBadge, PriceVariant } from '@/models/menu'
import type { PricePosition } from '@/models/layout'
import { DIETARY_ICON_META, ITEM_BADGE_META, createPriceVariant } from '@/models/menu'

interface ItemEditorProps {
  sectionId: string
  item: MenuItem
  dragHandleProps?: Record<string, unknown>
}

export const ItemEditor: React.FC<ItemEditorProps> = ({ sectionId, item, dragHandleProps }) => {
  const { updateItem, removeItem, duplicateItem, toggleDietaryIcon, toggleItemBadge, toggleItemHighlight } = useMenuStore()
  const { selectedItemId, selectItem, markDirty, showItemBadges, showDietaryIcons, showFeaturedItem, showPriceVariants, showCustomLayout, layoutViews, activeLayoutViewId, toggleViewItemVisibility } = useUIStore()

  const hasViews = layoutViews.length > 0
  const activeView = layoutViews.find(v => v.id === activeLayoutViewId)
  const isHiddenInView = hasViews && (activeView?.hiddenItemIds ?? []).includes(item.id)

  const isSelected = selectedItemId === item.id
  const isCustom = !!item.customRender
  const editorRef = useRef<HTMLDivElement>(null)
  const skipNextSync = useRef(false)

  const handleClick = () => {
    selectItem(sectionId, item.id)
  }

  // Populate contentEditable on mount and sync external changes (e.g. undo)
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false
      return
    }
    if (editorRef.current && item.customRender !== undefined) {
      if (editorRef.current.innerHTML !== item.customRender) {
        editorRef.current.innerHTML = item.customRender
      }
    }
  }, [item.customRender, isCustom])

  const handleCustomInput = useCallback(() => {
    if (!editorRef.current) return
    skipNextSync.current = true
    updateItem(sectionId, item.id, { customRender: editorRef.current.innerHTML })
    markDirty()
  }, [sectionId, item.id, updateItem, markDirty])

  const execFormat = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    handleCustomInput()
  }, [handleCustomInput])

  const handleEnableCustom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const pl = useLayoutStore.getState().pageLayout
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const nameStyle = pl.typography.itemName
    const descStyle = pl.typography.itemDescription
    const priceStyle = pl.typography.itemPrice
    const textColor = nameStyle.color || pl.colorScheme.text
    const priceColor = priceStyle.color || pl.colorScheme.accent
    const descColor = descStyle.color || pl.colorScheme.text
    const priceFormat = pl.priceFormat || 'right-aligned'
    const pricePosition = item.pricePosition || pl.pricePosition
    const currency = (pl.currency || '$') === 'none' ? '' : (pl.currency || '$')

    // Format price text
    let priceText = ''
    const hasVariants = item.variants && item.variants.length > 0
    if (hasVariants) {
      const variantMode = pl.variantDisplayMode || 'inline'
      if (variantMode === 'inline') {
        const parts = item.variants!.filter(v => v.price).map(v => `${v.label ? esc(v.label) + ' ' : ''}${currency}${esc(v.price)}`)
        priceText = parts.join(' / ')
      }
    } else if (item.price) {
      priceText = `${currency}${esc(item.price)}${item.priceLabel ? ' ' + esc(item.priceLabel) : ''}`
    }

    // Build name row — flex container matching preview's nameRowStyle
    const isBelow = pricePosition === 'below'
    const justify = isBelow ? 'flex-start' : (priceFormat === 'right-aligned' ? 'space-between' : 'flex-start')
    const nameGap = isBelow ? '0' : (priceFormat === 'inline' ? '8px' : '0')

    let html = ''

    // Name row
    html += `<div style="display:flex;justify-content:${justify};align-items:center;gap:${nameGap};margin-bottom:${item.description || isBelow ? '2px' : '0'}">`
    html += `<span style="font-family:${nameStyle.fontFamily};font-size:${nameStyle.fontSize}pt;font-weight:${nameStyle.fontWeight};color:${textColor};letter-spacing:${nameStyle.letterSpacing}px;line-height:${nameStyle.lineHeight};flex:1 1 auto;min-width:0">${esc(item.name)}</span>`
    if (priceText && !isBelow && !(hasVariants && (pl.variantDisplayMode || 'inline') === 'stacked')) {
      html += `<span style="font-family:${priceStyle.fontFamily};font-size:${priceStyle.fontSize}pt;font-weight:${priceStyle.fontWeight};color:${priceColor};white-space:nowrap;flex-shrink:0">${priceText}</span>`
    }
    html += '</div>'

    // Price below row
    if (isBelow && priceText) {
      html += `<div style="margin-top:1px"><span style="font-family:${priceStyle.fontFamily};font-size:${priceStyle.fontSize}pt;font-weight:${priceStyle.fontWeight};color:${priceColor}">${priceText}</span></div>`
    }

    // Stacked variants
    if (hasVariants && (pl.variantDisplayMode || 'inline') === 'stacked') {
      html += '<div style="margin-top:1px">'
      for (const v of item.variants!.filter(v => v.price)) {
        html += `<div style="display:flex;justify-content:${priceFormat === 'right-aligned' ? 'space-between' : 'flex-start'};padding-left:10px">`
        html += `<span style="font-family:${priceStyle.fontFamily};font-size:${Math.max(7, priceStyle.fontSize - 1)}pt;font-weight:400;color:${textColor}">${esc(v.label)}</span>`
        html += `<span style="font-family:${priceStyle.fontFamily};font-size:${priceStyle.fontSize}pt;font-weight:${priceStyle.fontWeight};color:${priceColor}">${currency}${esc(v.price)}</span>`
        html += '</div>'
      }
      html += '</div>'
    }

    // Description
    if (item.description) {
      html += `<div style="font-family:${descStyle.fontFamily};font-size:${descStyle.fontSize}pt;font-weight:${descStyle.fontWeight};color:${descColor};letter-spacing:${descStyle.letterSpacing}px;line-height:${descStyle.lineHeight};margin-top:2px">${esc(item.description)}</div>`
    }

    updateItem(sectionId, item.id, { customRender: html })
    markDirty()
  }, [sectionId, item.id, item.name, item.price, item.priceLabel, item.description, item.variants, item.pricePosition, updateItem, markDirty])

  const handleDisableCustom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    updateItem(sectionId, item.id, { customRender: undefined })
    markDirty()
  }, [sectionId, item.id, updateItem, markDirty])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeItem(sectionId, item.id)
    markDirty()
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateItem(sectionId, item.id)
    markDirty()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateItem(sectionId, item.id, { name: e.target.value })
    markDirty()
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateItem(sectionId, item.id, { description: e.target.value })
    markDirty()
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateItem(sectionId, item.id, { price: e.target.value })
    markDirty()
  }

  const handlePriceLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateItem(sectionId, item.id, { priceLabel: e.target.value })
    markDirty()
  }

  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateItem(sectionId, item.id, { isAvailable: e.target.checked })
    markDirty()
  }

  return (
    <div
      onClick={handleClick}
      data-item-id={item.id}
      className={`p-3 border-b border-neutral-100 last:border-b-0 cursor-pointer hover:bg-neutral-50 transition-colors ${
        isSelected ? 'ring-2 ring-amber-500/30 bg-amber-50/20' : ''
      } ${isHiddenInView ? 'opacity-40' : ''}`}
    >
      {/* Row 1: Drag Handle + Item Name + Delete */}
      <div className="flex items-center gap-2 mb-2">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 select-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder item"
            role="button"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
            </svg>
          </span>
        )}
        {!isCustom && (
          <input
            type="text"
            value={item.name}
            onChange={handleNameChange}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Item name"
          />
        )}
        {isCustom && (
          <span className="flex-1 text-sm font-medium text-amber-700 truncate">Custom Layout</span>
        )}
        <button
          onClick={handleDuplicate}
          className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-amber-600 hover:bg-neutral-100 text-sm font-medium transition-colors"
          title="Duplicate item"
        >
          ⧉
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 text-sm font-bold transition-colors"
          title="Delete item"
        >
          ✕
        </button>
      </div>

      {/* View visibility checkboxes */}
      {hasViews && (
        <div className="flex items-center gap-2.5 px-1 mb-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Show in:</span>
          {layoutViews.map((view) => {
            const isVisible = !(view.hiddenItemIds ?? []).includes(item.id)
            return (
              <label key={view.id} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => { toggleViewItemVisibility(item.id, view.id); markDirty() }}
                  className="w-3 h-3 text-amber-600 border-neutral-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className={`text-[11px] ${isVisible ? 'text-neutral-700 font-medium' : 'text-neutral-400'}`}>{view.name}</span>
              </label>
            )
          })}
        </div>
      )}

      {isCustom ? (
        /* Custom rich-text editor */
        <div className="mb-2" onClick={(e) => e.stopPropagation()}>
          {/* Formatting toolbar */}
          <div className="flex items-center gap-0.5 mb-1 pb-1 border-b border-neutral-200">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('bold') }}
              className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold text-neutral-600 hover:bg-neutral-100" title="Bold">B</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('italic') }}
              className="w-7 h-7 flex items-center justify-center rounded text-xs italic text-neutral-600 hover:bg-neutral-100" title="Italic">I</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('underline') }}
              className="w-7 h-7 flex items-center justify-center rounded text-xs underline text-neutral-600 hover:bg-neutral-100" title="Underline">U</button>
            <span className="w-px h-5 bg-neutral-200 mx-1" />
            <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('justifyLeft') }}
              className="w-7 h-7 flex items-center justify-center rounded text-neutral-600 hover:bg-neutral-100" title="Align left">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="2" /><rect x="0" y="5" width="10" height="2" /><rect x="0" y="9" width="14" height="2" /><rect x="0" y="13" width="8" height="2" /></svg>
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('justifyCenter') }}
              className="w-7 h-7 flex items-center justify-center rounded text-neutral-600 hover:bg-neutral-100" title="Align center">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="2" /><rect x="3" y="5" width="10" height="2" /><rect x="1" y="9" width="14" height="2" /><rect x="4" y="13" width="8" height="2" /></svg>
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); execFormat('justifyRight') }}
              className="w-7 h-7 flex items-center justify-center rounded text-neutral-600 hover:bg-neutral-100" title="Align right">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="2" /><rect x="6" y="5" width="10" height="2" /><rect x="2" y="9" width="14" height="2" /><rect x="8" y="13" width="8" height="2" /></svg>
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={handleDisableCustom}
              className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-medium transition-colors"
              title="Switch back to structured fields"
            >
              Exit Custom
            </button>
          </div>
          {/* Editable area — content is user-authored, not external input */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleCustomInput}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault()
                document.execCommand('insertHTML', false, '&emsp;')
                handleCustomInput()
              }
            }}
            className="w-full min-h-[60px] px-3 py-2 border border-amber-300 rounded-lg text-sm bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />
          <p className="text-[10px] text-neutral-400 mt-1">Edit freely with bold, italic, line breaks. Replaces the structured name/description/price.</p>
        </div>
      ) : (
        <>
          {/* Row 2: Description */}
          <div className="mb-2">
            <textarea
              value={item.description}
              onChange={handleDescriptionChange}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => { e.currentTarget.rows = 3 }}
              onBlur={(e) => { e.currentTarget.rows = item.description ? 2 : 1 }}
              rows={item.description ? 2 : 1}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Item description (optional)"
            />
          </div>
        </>
      )}

      {/* Row 3: Price / Variants (hidden in custom mode) */}
      {!isCustom && ((!item.variants || item.variants.length === 0) ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative w-24">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
              <input
                type="text"
                value={item.price}
                onChange={handlePriceChange}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-6 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <input
              type="text"
              value={item.priceLabel}
              onChange={handlePriceLabelChange}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="per glass, each, etc. (appended to price)"
            />
          </div>
          {showPriceVariants && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateItem(sectionId, item.id, { variants: [createPriceVariant(), createPriceVariant()] })
                markDirty()
              }}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium mb-2"
            >
              + Add size variants
            </button>
          )}
        </>
      ) : (
        <div className="mb-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Size Variants</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateItem(sectionId, item.id, { variants: undefined })
                markDirty()
              }}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Remove variants
            </button>
          </div>
          {item.variants.map((variant: PriceVariant, idx: number) => (
            <div key={variant.id} className="flex items-center gap-1.5">
              <input
                type="text"
                value={variant.label}
                onChange={(e) => {
                  e.stopPropagation()
                  const updated = item.variants!.map((v: PriceVariant) =>
                    v.id === variant.id ? { ...v, label: e.target.value } : v
                  )
                  updateItem(sectionId, item.id, { variants: updated })
                  markDirty()
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-2 py-1.5 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Size label"
              />
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">$</span>
                <input
                  type="text"
                  value={variant.price}
                  onChange={(e) => {
                    e.stopPropagation()
                    const updated = item.variants!.map((v: PriceVariant) =>
                      v.id === variant.id ? { ...v, price: e.target.value } : v
                    )
                    updateItem(sectionId, item.id, { variants: updated })
                    markDirty()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full pl-5 pr-2 py-1.5 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              {item.variants!.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const updated = item.variants!.filter((v: PriceVariant) => v.id !== variant.id)
                    updateItem(sectionId, item.id, { variants: updated })
                    markDirty()
                  }}
                  className="text-neutral-400 hover:text-red-500 text-sm font-bold transition-colors px-1"
                  title="Remove variant"
                >
                  x
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              updateItem(sectionId, item.id, { variants: [...item.variants!, createPriceVariant()] })
              markDirty()
            }}
            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
          >
            + Add variant
          </button>
        </div>
      ))}

      {/* Price Position Override */}
      {!isCustom && (item.price || (item.variants && item.variants.length > 0)) && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-neutral-500">Price position:</span>
          <div className="flex">
            {([
              [undefined, 'Global'],
              ['inline' as PricePosition, 'Beside'],
              ['below' as PricePosition, 'Below'],
            ] as const).map(([value, label], i, arr) => (
              <button
                key={label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  updateItem(sectionId, item.id, { pricePosition: value as PricePosition | undefined })
                  markDirty()
                }}
                className={`px-2 py-1 text-xs border ${
                  i > 0 ? 'border-l-0' : ''
                } ${i === 0 ? 'rounded-l-md' : ''} ${i === arr.length - 1 ? 'rounded-r-md' : ''} ${
                  item.pricePosition === value
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: Availability Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.isAvailable}
            onChange={handleAvailabilityChange}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-sm text-neutral-600">Available</span>
        </label>
      </div>

      {/* Row 5: Dietary Icons (preference-gated) */}
      {showDietaryIcons && <div className="flex flex-wrap gap-1 mt-2">
        {(Object.keys(DIETARY_ICON_META) as DietaryIcon[]).map((icon) => {
          const meta = DIETARY_ICON_META[icon]
          const active = item.dietaryIcons?.includes(icon) || false
          return (
            <button
              key={icon}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleDietaryIcon(sectionId, item.id, icon)
                markDirty()
              }}
              title={meta.label}
              className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${
                active
                  ? 'border-current opacity-100'
                  : 'border-neutral-200 opacity-40 hover:opacity-70'
              }`}
              style={{ color: meta.color }}
            >
              {meta.abbr}
            </button>
          )
        })}
      </div>}

      {/* Row 6: Item Badges (preference-gated) */}
      {showItemBadges && <div className="flex flex-wrap gap-1 mt-2">
        {(Object.keys(ITEM_BADGE_META) as ItemBadge[]).map((badge) => {
          const meta = ITEM_BADGE_META[badge]
          const active = item.badges?.includes(badge) || false
          return (
            <button
              key={badge}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleItemBadge(sectionId, item.id, badge)
                markDirty()
              }}
              title={meta.label}
              className={`px-2 py-1 text-xs font-bold rounded transition-opacity ${
                active ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
              style={{ backgroundColor: meta.bgColor, color: meta.color }}
            >
              {meta.abbr}
            </button>
          )
        })}
      </div>}

      {/* Row 7: Featured checkbox (preference-gated) */}
      {showFeaturedItem && (
        <label className="flex items-center gap-2 cursor-pointer mt-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={item.isHighlighted || false}
            onChange={(e) => {
              e.stopPropagation()
              toggleItemHighlight(sectionId, item.id)
              markDirty()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-sm text-neutral-600">Featured item</span>
        </label>
      )}

      {/* Custom Layout toggle (preference-gated) */}
      {showCustomLayout && !isCustom && (
        <button
          type="button"
          onClick={handleEnableCustom}
          className="mt-2 text-xs text-neutral-400 hover:text-amber-600 font-medium transition-colors"
        >
          Use Custom Layout
        </button>
      )}
    </div>
  )
}
