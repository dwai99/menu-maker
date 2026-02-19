import React, { useState, useEffect, useMemo, useCallback } from 'react'
import templates, { type MenuTemplate } from '@/templates'
import { TemplatePreviewSwatch } from './TemplatePreviewSwatch'

interface TemplateGalleryProps {
  onSelect: (template: MenuTemplate) => void
  onClose: () => void
}

type CategoryFilter = MenuTemplate['category'] | 'all'

const categoryColors: Record<MenuTemplate['category'], string> = {
  cocktail: 'bg-purple-100 text-purple-800',
  dinner: 'bg-amber-100 text-amber-800',
  wine: 'bg-rose-100 text-rose-800',
  brunch: 'bg-orange-100 text-orange-800',
  beer: 'bg-yellow-100 text-yellow-800',
  dessert: 'bg-pink-100 text-pink-800',
  'table-tent': 'bg-blue-100 text-blue-800',
  blank: 'bg-gray-100 text-gray-800',
  cafe: 'bg-amber-100 text-amber-800',
  pizzeria: 'bg-red-100 text-red-800',
  sushi: 'bg-indigo-100 text-indigo-800',
  bakery: 'bg-rose-100 text-rose-800',
  taqueria: 'bg-lime-100 text-lime-800',
}

const categoryLabels: Record<MenuTemplate['category'], string> = {
  cocktail: 'Cocktail',
  dinner: 'Dinner',
  wine: 'Wine',
  brunch: 'Brunch',
  beer: 'Beer',
  dessert: 'Dessert',
  'table-tent': 'Table Tent',
  blank: 'Blank',
  cafe: 'Cafe',
  pizzeria: 'Pizzeria',
  sushi: 'Sushi',
  bakery: 'Bakery',
  taqueria: 'Taqueria',
}

const TAG_DISPLAY_LABELS: Record<string, string> = {
  'dark-theme': 'Dark Theme',
  'light-theme': 'Light Theme',
  'multi-section': 'Multi-Section',
  compact: 'Compact',
  elegant: 'Elegant',
  modern: 'Modern',
  'multi-column': 'Multi-Column',
}

// Canonical tag order for display
const TAG_ORDER = [
  'dark-theme',
  'light-theme',
  'elegant',
  'modern',
  'multi-section',
  'compact',
  'multi-column',
]

interface CustomTemplateEntry {
  name: string
  path: string
}

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFeatureTags, setActiveFeatureTags] = useState<string[]>([])
  const [customTemplates, setCustomTemplates] = useState<CustomTemplateEntry[]>([])

  // Load custom templates on mount
  useEffect(() => {
    window.electronAPI?.listCustomTemplates().then((result) => {
      if (result?.success) {
        setCustomTemplates(result.templates || [])
      }
    })
  }, [])

  // Derive the full sorted list of unique tags across all templates
  const allFeatureTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const template of templates) {
      for (const tag of template.tags ?? []) {
        tagSet.add(tag)
      }
    }
    return TAG_ORDER.filter((tag) => tagSet.has(tag))
  }, [])

  const toggleFeatureTag = useCallback((tag: string) => {
    setActiveFeatureTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleLoadCustom = async (entry: CustomTemplateEntry) => {
    const result = await window.electronAPI?.loadCustomTemplate(entry.path)
    if (result?.success && result.data) {
      try {
        const parsed = JSON.parse(result.data)
        onSelect({
          id: `custom-${entry.name}`,
          name: entry.name,
          description: 'Custom template',
          category: 'blank',
          menuData: parsed.menuData,
          pageLayout: parsed.pageLayout,
        })
      } catch { /* ignore parse errors */ }
    }
  }

  const handleDeleteCustom = async (entry: CustomTemplateEntry) => {
    if (!confirm(`Delete template "${entry.name}"?`)) return
    await window.electronAPI?.deleteCustomTemplate(entry.path)
    setCustomTemplates((prev) => prev.filter((t) => t.path !== entry.path))
  }

  const filteredTemplates = useMemo(() => {
    let result = templates

    // 1. Category filter
    if (selectedFilter !== 'all') {
      result = result.filter((t) => t.category === selectedFilter)
    }

    // 2. Feature tag filter (AND logic — template must have ALL selected tags)
    if (activeFeatureTags.length > 0) {
      result = result.filter((t) =>
        activeFeatureTags.every((tag) => t.tags?.includes(tag))
      )
    }

    // 3. Search query against name and description (case-insensitive)
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      )
    }

    return result
  }, [selectedFilter, activeFeatureTags, searchQuery])

  const categories: MenuTemplate['category'][] = [
    'cocktail',
    'dinner',
    'wine',
    'brunch',
    'beer',
    'dessert',
    'table-tent',
    'cafe',
    'pizzeria',
    'sushi',
    'bakery',
    'taqueria',
    'blank',
  ]

  const hasActiveFilters =
    selectedFilter !== 'all' || activeFeatureTags.length > 0 || searchQuery.trim().length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choose a Template</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close template gallery"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Box */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Filters + Feature Tag Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              All Templates
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedFilter(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === category
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          {/* Feature tag toggle pills */}
          {allFeatureTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allFeatureTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleFeatureTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFeatureTags.includes(tag)
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {TAG_DISPLAY_LABELS[tag] ?? tag}
                </button>
              ))}
              {activeFeatureTags.length > 0 && (
                <button
                  onClick={() => setActiveFeatureTags([])}
                  className="px-3 py-1 rounded-full text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Custom Templates */}
          {customTemplates.length > 0 && selectedFilter === 'all' && !searchQuery && activeFeatureTags.length === 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">My Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {customTemplates.map((entry) => (
                  <div
                    key={entry.path}
                    className="group flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:border-amber-500 hover:shadow-md transition-all bg-white"
                  >
                    <button
                      onClick={() => handleLoadCustom(entry)}
                      className="text-left flex-1"
                    >
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                        {entry.name}
                      </h4>
                      <span className="text-xs text-gray-400">Custom</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCustom(entry)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-sm px-2"
                      title="Delete template"
                    >
                      &#x2715;
                    </button>
                  </div>
                ))}
              </div>
              <hr className="border-gray-200 mb-6" />
            </div>
          )}

          {/* Results count */}
          {hasActiveFilters && (
            <p className="text-xs text-gray-500 mb-4">
              Showing {filteredTemplates.length} of {templates.length} templates
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="group text-left border border-gray-200 rounded-lg p-0 overflow-hidden hover:border-amber-500 hover:shadow-lg transition-all bg-white"
              >
                <TemplatePreviewSwatch
                  colorScheme={template.pageLayout.colorScheme}
                  typography={template.pageLayout.typography}
                  title={template.menuData.title}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                      {template.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        categoryColors[template.category]
                      }`}
                    >
                      {categoryLabels[template.category]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {template.description}
                  </p>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200"
                        >
                          {TAG_DISPLAY_LABELS[tag] ?? tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {template.menuData.sections.length} section
                        {template.menuData.sections.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {template.menuData.sections.reduce(
                          (total, section) => total + section.items.length,
                          0
                        )}{' '}
                        item
                        {template.menuData.sections.reduce(
                          (total, section) => total + section.items.length,
                          0
                        ) !== 1
                          ? 's'
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No templates match your search.</p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSelectedFilter('all')
                    setActiveFeatureTags([])
                    setSearchQuery('')
                  }}
                  className="text-sm text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
