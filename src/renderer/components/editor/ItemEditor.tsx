import React, { useState } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useUIStore } from '@/stores/ui-store'
import type { MenuItem, DietaryIcon, ItemBadge, PriceVariant } from '@/models/menu'
import { DIETARY_ICON_META, ITEM_BADGE_META, createPriceVariant } from '@/models/menu'

interface ItemEditorProps {
  sectionId: string
  item: MenuItem
  dragHandleProps?: Record<string, unknown>
}

export const ItemEditor: React.FC<ItemEditorProps> = ({ sectionId, item, dragHandleProps }) => {
  const { updateItem, removeItem, duplicateItem, toggleDietaryIcon, toggleItemBadge, toggleItemHighlight } = useMenuStore()
  const { selectedItemId, selectItem, markDirty } = useUIStore()

  const isSelected = selectedItemId === item.id

  const handleClick = () => {
    selectItem(sectionId, item.id)
  }

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
      className={`p-3 border-b border-neutral-100 last:border-b-0 cursor-pointer hover:bg-neutral-50 transition-colors ${
        isSelected ? 'ring-2 ring-amber-500/30 bg-amber-50/20' : ''
      }`}
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
        <input
          type="text"
          value={item.name}
          onChange={handleNameChange}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Item name"
        />
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

      {/* Row 2: Description (collapses to 1 row when unfocused) */}
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

      {/* Row 3: Price / Variants */}
      {(!item.variants || item.variants.length === 0) ? (
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

      {/* Row 5: Dietary Icons */}
      <div className="flex flex-wrap gap-1 mt-2">
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
      </div>

      {/* Row 6: Item Badges */}
      <div className="flex flex-wrap gap-1 mt-2">
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
      </div>

      {/* Row 7: Featured checkbox */}
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
    </div>
  )
}
