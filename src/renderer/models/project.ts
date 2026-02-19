import { MenuData, createDefaultMenuData } from './menu'
import { PageLayout, createDefaultPageLayout } from './layout'
import type { Vertex, SectionLayout } from './layout'

export interface MenuProject {
  version: 1 | 2 | 3
  menuData: MenuData
  pageLayout: PageLayout
  createdAt: string
  updatedAt: string
}

/** Convert a v1 rect (x, y, width, height percentages) to a 4-vertex polygon */
function rectToPolygon(x: number, y: number, w: number, h: number): Vertex[] {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
}

/** Migrate a v1 project (rect-based layouts) to v2 (polygon-based layouts) */
export function migrateProject(project: any): MenuProject {
  // Backfill fields for v2 files created before these were added
  if (project.pageLayout && !project.pageLayout.layoutDirection) {
    project = { ...project, pageLayout: { ...project.pageLayout, layoutDirection: 'vertical' } }
  }
  if (project.pageLayout && !project.pageLayout.sectionDecoration) {
    project = { ...project, pageLayout: { ...project.pageLayout, sectionDecoration: 'none' } }
  }
  if (project.pageLayout && !project.pageLayout.currency) {
    project = { ...project, pageLayout: { ...project.pageLayout, currency: '$' } }
  }
  if (project.pageLayout && !project.pageLayout.backgroundTexture) {
    project = { ...project, pageLayout: { ...project.pageLayout, backgroundTexture: 'none' } }
  }
  if (project.pageLayout && !project.pageLayout.sectionDivider) {
    project = { ...project, pageLayout: { ...project.pageLayout, sectionDivider: 'none' } }
  }
  if (project.pageLayout && !project.pageLayout.pageBorder) {
    project = { ...project, pageLayout: { ...project.pageLayout, pageBorder: 'none' } }
  }
  if (project.pageLayout && project.pageLayout.sectionGap == null) {
    project = { ...project, pageLayout: { ...project.pageLayout, sectionGap: 16 } }
  }
  // Backfill headerHeight if missing
  if (project.pageLayout && project.pageLayout.headerHeight == null) {
    project = { ...project, pageLayout: { ...project.pageLayout, headerHeight: 120 } }
  }
  // Migrate single sectionDecoration to sectionDecorations array
  if (project.pageLayout && project.pageLayout.sectionDecoration && !project.pageLayout.sectionDecorations) {
    const dec = project.pageLayout.sectionDecoration
    project = {
      ...project,
      pageLayout: {
        ...project.pageLayout,
        sectionDecorations: dec === 'none' ? [] : [dec],
      },
    }
  }

  // Migrate logo from position string to x/y coordinates
  if (project.menuData?.logo && 'position' in project.menuData.logo) {
    const logo = project.menuData.logo as any
    let x = 50, y = 0
    if (logo.position === 'top-left') { x = 0; y = 0 }
    else if (logo.position === 'top-right') { x = 100; y = 0 }
    const { position: _, ...rest } = logo
    project = {
      ...project,
      menuData: { ...project.menuData, logo: { ...rest, x, y } },
    }
  }

  if (project.version === 3) return project as MenuProject

  if (project.version === 2) {
    // v2 → v3: just bump version (pages is optional, so v2 files work as-is)
    return { ...project, version: 3 as const } as MenuProject
  }

  // v1 → v2: convert x/y/width/height to polygon, add page-level columnCount
  const migrated = { ...project, version: 2 as const }

  // Ensure page-level columnCount exists
  if (migrated.pageLayout && !migrated.pageLayout.columnCount) {
    migrated.pageLayout = { ...migrated.pageLayout, columnCount: 1 }
  }

  if (migrated.pageLayout?.sectionLayouts) {
    migrated.pageLayout = {
      ...migrated.pageLayout,
      sectionLayouts: migrated.pageLayout.sectionLayouts.map((sl: any): SectionLayout => {
        if (sl.polygon) return sl // already migrated
        const x = sl.x ?? 0
        const y = sl.y ?? 0
        const w = sl.width ?? 100
        const h = sl.height ?? 0
        return {
          sectionId: sl.sectionId,
          polygon: rectToPolygon(x, y, w, h === 0 ? 100 : h),
          columnCount: sl.columnCount ?? 1,
          pageIndex: sl.pageIndex ?? 0,
        }
      }),
    }
  }

  return migrated as MenuProject
}

export function createNewProject(): MenuProject {
  const now = new Date().toISOString()

  return {
    version: 3,
    menuData: createDefaultMenuData(),
    pageLayout: createDefaultPageLayout(),
    createdAt: now,
    updatedAt: now,
  }
}
