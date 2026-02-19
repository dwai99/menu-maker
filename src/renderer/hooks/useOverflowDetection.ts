import { useEffect } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import { PAGE_SIZES } from '@/models/layout'
import { detectOverflow } from '@/layout/overflow'

/**
 * Recomputes overflow state whenever menu data, typography, margins,
 * or page size change. Stores result in ui-store.
 */
export function useOverflowDetection(): void {
  const menuData = useMenuStore((s) => s.menuData)
  const pageLayout = useLayoutStore((s) => s.pageLayout)
  const setOverflowState = useUIStore((s) => s.setOverflowState)

  useEffect(() => {
    const result = detectOverflow(
      menuData.sections,
      pageLayout,
      menuData,
      PAGE_SIZES,
    )
    setOverflowState(result)
  }, [
    menuData,
    pageLayout.pageSize,
    pageLayout.orientation,
    pageLayout.margins,
    pageLayout.typography,
    pageLayout.itemSeparator,
    pageLayout.sectionLayouts,
    pageLayout.variantDisplayMode,
    setOverflowState,
  ])
}
