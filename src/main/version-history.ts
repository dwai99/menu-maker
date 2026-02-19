import { join, dirname } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { gzipSync, gunzipSync } from 'zlib'
import { randomUUID } from 'crypto'

export interface VersionEntry {
    id: string
    timestamp: string
    author: string
    summary: string
    snapshotFileName: string
    parentId: string | null
}

export interface VersionManifest {
    projectName: string
    entries: VersionEntry[]
}

const MAX_VERSIONS = 50

/**
 * Get the history directory for a given project file path.
 * Creates a `.menu-history/` sidecar directory next to the project file.
 */
export function getHistoryDir(projectFilePath: string): string {
    const dir = join(dirname(projectFilePath), '.menu-history', getBaseName(projectFilePath))
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }
    return dir
}

function getBaseName(filePath: string): string {
    const base = filePath.split(/[\\/]/).pop() || 'untitled'
    return base.replace(/\.[^.]+$/, '') // strip extension
}

function getManifestPath(historyDir: string): string {
    return join(historyDir, 'manifest.json')
}

function loadManifest(historyDir: string): VersionManifest {
    const path = getManifestPath(historyDir)
    if (existsSync(path)) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8'))
        } catch {
            return { projectName: '', entries: [] }
        }
    }
    return { projectName: '', entries: [] }
}

function saveManifest(historyDir: string, manifest: VersionManifest): void {
    writeFileSync(getManifestPath(historyDir), JSON.stringify(manifest, null, 2))
}

/**
 * Create a version snapshot of the current project state.
 */
export function createSnapshot(
    projectFilePath: string,
    projectJson: string,
    summary: string = 'Auto-save',
    author: string = 'User'
): VersionEntry {
    const historyDir = getHistoryDir(projectFilePath)
    const manifest = loadManifest(historyDir)

    const id = randomUUID()
    const timestamp = new Date().toISOString()
    const snapshotFileName = `${timestamp.replace(/[:.]/g, '-')}_${id.slice(0, 8)}.json.gz`

    // Gzip the project JSON and save
    const compressed = gzipSync(Buffer.from(projectJson, 'utf-8'))
    writeFileSync(join(historyDir, snapshotFileName), compressed)

    const entry: VersionEntry = {
        id,
        timestamp,
        author,
        summary,
        snapshotFileName,
        parentId: manifest.entries.length > 0 ? manifest.entries[manifest.entries.length - 1].id : null,
    }

    manifest.entries.push(entry)
    manifest.projectName = getBaseName(projectFilePath)

    // Prune old entries if over limit
    while (manifest.entries.length > MAX_VERSIONS) {
        const removed = manifest.entries.shift()!
        const removedPath = join(historyDir, removed.snapshotFileName)
        try {
            if (existsSync(removedPath)) unlinkSync(removedPath)
        } catch { /* ignore cleanup errors */ }
    }

    saveManifest(historyDir, manifest)
    return entry
}

/**
 * List all version entries for a project.
 */
export function listVersions(projectFilePath: string): VersionEntry[] {
    const historyDir = getHistoryDir(projectFilePath)
    const manifest = loadManifest(historyDir)
    return [...manifest.entries].reverse() // newest first
}

/**
 * Load the project JSON from a specific version snapshot.
 */
export function loadSnapshot(projectFilePath: string, versionId: string): string | null {
    const historyDir = getHistoryDir(projectFilePath)
    const manifest = loadManifest(historyDir)
    const entry = manifest.entries.find(e => e.id === versionId)
    if (!entry) return null

    const snapshotPath = join(historyDir, entry.snapshotFileName)
    if (!existsSync(snapshotPath)) return null

    try {
        const compressed = readFileSync(snapshotPath)
        return gunzipSync(compressed).toString('utf-8')
    } catch {
        return null
    }
}

/**
 * Compute a summary of differences between two project JSON strings.
 * Returns a human-readable description of what changed.
 */
export function diffSummary(oldJson: string, newJson: string): string {
    try {
        const oldProject = JSON.parse(oldJson)
        const newProject = JSON.parse(newJson)
        const changes: string[] = []

        // Menu data changes
        const oldMenu = oldProject.menuData || {}
        const newMenu = newProject.menuData || {}

        if (oldMenu.title !== newMenu.title) changes.push('Title changed')
        if (oldMenu.subtitle !== newMenu.subtitle) changes.push('Subtitle changed')
        if (oldMenu.footer !== newMenu.footer) changes.push('Footer changed')

        const oldSections = oldMenu.sections || []
        const newSections = newMenu.sections || []

        if (oldSections.length !== newSections.length) {
            const diff = newSections.length - oldSections.length
            changes.push(`${Math.abs(diff)} section(s) ${diff > 0 ? 'added' : 'removed'}`)
        }

        // Count total items
        const oldItemCount = oldSections.reduce((n: number, s: any) => n + (s.items?.length || 0), 0)
        const newItemCount = newSections.reduce((n: number, s: any) => n + (s.items?.length || 0), 0)
        if (oldItemCount !== newItemCount) {
            const diff = newItemCount - oldItemCount
            changes.push(`${Math.abs(diff)} item(s) ${diff > 0 ? 'added' : 'removed'}`)
        }

        // Layout changes
        const oldLayout = oldProject.pageLayout || {}
        const newLayout = newProject.pageLayout || {}

        if (oldLayout.pageSize !== newLayout.pageSize) changes.push('Page size changed')
        if (oldLayout.orientation !== newLayout.orientation) changes.push('Orientation changed')
        if (oldLayout.columnCount !== newLayout.columnCount) changes.push('Column count changed')
        if (JSON.stringify(oldLayout.colorScheme) !== JSON.stringify(newLayout.colorScheme)) changes.push('Color scheme changed')

        return changes.length > 0 ? changes.join(', ') : 'Minor changes'
    } catch {
        return 'Changes saved'
    }
}
