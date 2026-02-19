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
