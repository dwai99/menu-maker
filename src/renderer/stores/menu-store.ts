import { create } from 'zustand'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import {
  MenuData,
  MenuSection,
  MenuItem,
  LogoData,
  createDefaultMenuData,
  createMenuSection,
  createMenuItem,
} from '../models/menu'
import type { DietaryIcon, ItemBadge, SectionColorOverride, HeaderElementPosition } from '../models/menu'

interface MenuStore {
  menuData: MenuData

  // Menu-level
  setTitle: (title: string) => void
  setSubtitle: (subtitle: string) => void
  setFooter: (footer: string) => void
  setLogo: (logo: LogoData | undefined) => void
  setTitlePosition: (pos: HeaderElementPosition | undefined) => void
  setSubtitlePosition: (pos: HeaderElementPosition | undefined) => void

  // Section CRUD
  addSection: () => void
  removeSection: (sectionId: string) => void
  updateSection: (sectionId: string, updates: Partial<Pick<MenuSection, 'title' | 'subtitle' | 'footnote'>>) => void
  reorderSections: (fromIndex: number, toIndex: number) => void
  duplicateSection: (sectionId: string) => void
  updateSectionColor: (sectionId: string, colorOverride: SectionColorOverride | undefined) => void

  // Item CRUD
  addItem: (sectionId: string) => void
  removeItem: (sectionId: string, itemId: string) => void
  updateItem: (sectionId: string, itemId: string, updates: Partial<MenuItem>) => void
  reorderItems: (sectionId: string, fromIndex: number, toIndex: number) => void
  moveItem: (fromSectionId: string, toSectionId: string, itemId: string, toIndex: number) => void
  duplicateItem: (sectionId: string, itemId: string) => void
  toggleDietaryIcon: (sectionId: string, itemId: string, icon: DietaryIcon) => void
  toggleItemBadge: (sectionId: string, itemId: string, badge: ItemBadge) => void
  toggleItemHighlight: (sectionId: string, itemId: string) => void
  updateSectionIcon: (sectionId: string, icon: string) => void

  // Bulk
  appendSections: (sections: MenuSection[]) => void
  loadMenuData: (data: MenuData) => void
  reset: () => void
}

export const useMenuStore = create<MenuStore>()(temporal((set, get) => ({
  menuData: createDefaultMenuData(),

  // Menu-level
  setTitle: (title: string) => {
    set((state) => ({
      menuData: { ...state.menuData, title },
    }))
  },

  setSubtitle: (subtitle: string) => {
    set((state) => ({
      menuData: { ...state.menuData, subtitle },
    }))
  },

  setFooter: (footer: string) => {
    set((state) => ({
      menuData: { ...state.menuData, footer },
    }))
  },

  setLogo: (logo: LogoData | undefined) => {
    set((state) => ({
      menuData: { ...state.menuData, logo },
    }))
  },

  setTitlePosition: (pos: HeaderElementPosition | undefined) => {
    set((state) => ({
      menuData: { ...state.menuData, titlePosition: pos },
    }))
  },

  setSubtitlePosition: (pos: HeaderElementPosition | undefined) => {
    set((state) => ({
      menuData: { ...state.menuData, subtitlePosition: pos },
    }))
  },

  // Section CRUD
  addSection: () => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: [...state.menuData.sections, createMenuSection()],
      },
    }))
  },

  removeSection: (sectionId: string) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.filter((section) => section.id !== sectionId),
      },
    }))
  },

  updateSection: (sectionId: string, updates: Partial<Pick<MenuSection, 'title' | 'subtitle' | 'footnote'>>) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section
        ),
      },
    }))
  },

  reorderSections: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const sections = [...state.menuData.sections]
      const [removed] = sections.splice(fromIndex, 1)
      sections.splice(toIndex, 0, removed)

      return {
        menuData: {
          ...state.menuData,
          sections,
        },
      }
    })
  },

  duplicateSection: (sectionId: string) => {
    set((state) => {
      const idx = state.menuData.sections.findIndex((s) => s.id === sectionId)
      if (idx === -1) return state
      const original = state.menuData.sections[idx]
      const copy: MenuSection = {
        ...original,
        id: nanoid(),
        title: `${original.title} (copy)`,
        items: original.items.map((item) => ({
          ...item,
          id: nanoid(),
          variants: item.variants?.map((v) => ({ ...v, id: nanoid() })),
        })),
      }
      const sections = [...state.menuData.sections]
      sections.splice(idx + 1, 0, copy)
      return { menuData: { ...state.menuData, sections } }
    })
  },

  updateSectionColor: (sectionId: string, colorOverride: SectionColorOverride | undefined) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) =>
          section.id === sectionId ? { ...section, colorOverride } : section
        ),
      },
    }))
  },

  // Item CRUD
  addItem: (sectionId: string) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) =>
          section.id === sectionId
            ? { ...section, items: [...section.items, createMenuItem()] }
            : section
        ),
      },
    }))
  },

  removeItem: (sectionId: string, itemId: string) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) =>
          section.id === sectionId
            ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
            : section
        ),
      },
    }))
  },

  updateItem: (sectionId: string, itemId: string, updates: Partial<MenuItem>) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.id === itemId ? { ...item, ...updates } : item
                ),
              }
            : section
        ),
      },
    }))
  },

  reorderItems: (sectionId: string, fromIndex: number, toIndex: number) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) => {
          if (section.id === sectionId) {
            const items = [...section.items]
            const [removed] = items.splice(fromIndex, 1)
            items.splice(toIndex, 0, removed)
            return { ...section, items }
          }
          return section
        }),
      },
    }))
  },

  moveItem: (fromSectionId: string, toSectionId: string, itemId: string, toIndex: number) => {
    set((state) => {
      let itemToMove: MenuItem | null = null

      // Create new sections array with item removed from source
      const sectionsWithItemRemoved = state.menuData.sections.map((section) => {
        if (section.id === fromSectionId) {
          const items = section.items.filter((item) => {
            if (item.id === itemId) {
              itemToMove = item
              return false
            }
            return true
          })
          return { ...section, items }
        }
        return section
      })

      if (!itemToMove) {
        return state
      }

      // Add item to target section
      const finalSections = sectionsWithItemRemoved.map((section) => {
        if (section.id === toSectionId) {
          const items = [...section.items]
          items.splice(toIndex, 0, itemToMove!)
          return { ...section, items }
        }
        return section
      })

      return {
        menuData: {
          ...state.menuData,
          sections: finalSections,
        },
      }
    })
  },

  duplicateItem: (sectionId: string, itemId: string) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) => {
          if (section.id !== sectionId) return section
          const idx = section.items.findIndex((i) => i.id === itemId)
          if (idx === -1) return section
          const original = section.items[idx]
          const copy: MenuItem = {
            ...original,
            id: nanoid(),
            variants: original.variants?.map((v) => ({ ...v, id: nanoid() })),
          }
          const items = [...section.items]
          items.splice(idx + 1, 0, copy)
          return { ...section, items }
        }),
      },
    }))
  },

  toggleDietaryIcon: (sectionId: string, itemId: string, icon: DietaryIcon) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) => {
          if (section.id !== sectionId) return section
          return {
            ...section,
            items: section.items.map((item) => {
              if (item.id !== itemId) return item
              const current = item.dietaryIcons || []
              const has = current.includes(icon)
              return {
                ...item,
                dietaryIcons: has ? current.filter((i) => i !== icon) : [...current, icon],
              }
            }),
          }
        }),
      },
    }))
  },

  toggleItemBadge: (sectionId: string, itemId: string, badge: ItemBadge) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) => {
          if (section.id !== sectionId) return section
          return {
            ...section,
            items: section.items.map((item) => {
              if (item.id !== itemId) return item
              const current = item.badges || []
              const has = current.includes(badge)
              return {
                ...item,
                badges: has ? current.filter((b) => b !== badge) : [...current, badge],
              }
            }),
          }
        }),
      },
    }))
  },

  toggleItemHighlight: (sectionId: string, itemId: string) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) => {
          if (section.id !== sectionId) return section
          return {
            ...section,
            items: section.items.map((item) => {
              if (item.id !== itemId) return item
              return { ...item, isHighlighted: !item.isHighlighted }
            }),
          }
        }),
      },
    }))
  },

  updateSectionIcon: (sectionId: string, icon: string) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: state.menuData.sections.map((section) =>
          section.id === sectionId ? { ...section, icon } : section
        ),
      },
    }))
  },

  // Bulk
  appendSections: (sections: MenuSection[]) => {
    set((state) => ({
      menuData: {
        ...state.menuData,
        sections: [
          ...state.menuData.sections,
          ...sections.map((s) => ({
            ...s,
            id: nanoid(),
            items: s.items.map((i) => ({
              ...i,
              id: nanoid(),
              variants: i.variants?.map((v) => ({ ...v, id: nanoid() })),
            })),
          })),
        ],
      },
    }))
  },

  loadMenuData: (data: MenuData) => {
    set({ menuData: data })
  },

  reset: () => {
    set({ menuData: createDefaultMenuData() })
  },
}), { limit: 50 }))
