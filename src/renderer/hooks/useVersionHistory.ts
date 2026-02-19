import { useCallback, useState } from 'react'
import { useMenuStore } from '@/stores/menu-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useUIStore } from '@/stores/ui-store'
import { migrateProject } from '@/models/project'
import type { VersionEntry } from '@/models/version'

export function useVersionHistory() {
    const [versions, setVersions] = useState<VersionEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)

    /**
     * Create a snapshot of the current project state.
     */
    const createSnapshot = useCallback(async (summary?: string) => {
        if (!window.electronAPI) return
        const filePath = useUIStore.getState().currentFilePath
        if (!filePath) return

        const menuData = useMenuStore.getState().menuData
        const pageLayout = useLayoutStore.getState().pageLayout

        const projectJson = JSON.stringify({
            version: 3,
            menuData,
            pageLayout,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, null, 2)

        try {
            await window.electronAPI.createSnapshot({
                projectFilePath: filePath,
                projectJson,
                summary,
            })
        } catch (error) {
            console.error('Failed to create snapshot:', error)
        }
    }, [])

    /**
     * List all versions for the current project.
     */
    const loadVersions = useCallback(async () => {
        if (!window.electronAPI) return
        const filePath = useUIStore.getState().currentFilePath
        if (!filePath) {
            setVersions([])
            return
        }

        setIsLoading(true)
        try {
            const result = await window.electronAPI.listVersions(filePath)
            if (result.success && result.entries) {
                setVersions(result.entries)
            }
        } catch (error) {
            console.error('Failed to list versions:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Restore a specific version, loading it into the stores.
     */
    const restoreVersion = useCallback(async (versionId: string) => {
        if (!window.electronAPI) return
        const filePath = useUIStore.getState().currentFilePath
        if (!filePath) return

        try {
            // Create a snapshot of current state before restoring
            await createSnapshot('Before restore')

            const result = await window.electronAPI.loadSnapshot({
                projectFilePath: filePath,
                versionId,
            })

            if (result.success && result.data) {
                const projectData = JSON.parse(result.data)
                const migrated = migrateProject(projectData)
                useMenuStore.getState().loadMenuData(migrated.menuData)
                useLayoutStore.getState().loadPageLayout(migrated.pageLayout)
                useUIStore.getState().markDirty()
            }
        } catch (error) {
            console.error('Failed to restore version:', error)
        }
    }, [createSnapshot])

    /**
     * Preview a version without applying it (returns parsed data).
     */
    const previewVersion = useCallback(async (versionId: string) => {
        if (!window.electronAPI) return null
        const filePath = useUIStore.getState().currentFilePath
        if (!filePath) return null

        try {
            const result = await window.electronAPI.loadSnapshot({
                projectFilePath: filePath,
                versionId,
            })

            if (result.success && result.data) {
                return JSON.parse(result.data)
            }
        } catch (error) {
            console.error('Failed to preview version:', error)
        }
        return null
    }, [])

    return {
        versions,
        isLoading,
        createSnapshot,
        loadVersions,
        restoreVersion,
        previewVersion,
    }
}
