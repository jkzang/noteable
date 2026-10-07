import type { NoteMeta } from '@shared/types'

/** A folder in the vault, shown in the sidebar like a Notion parent page. */
export interface FolderNode {
  name: string
  /** Vault-relative folder path; "" for the vault root. */
  path: string
  folders: FolderNode[]
  notes: NoteMeta[]
}

/** Nests notes by folder. Sub-folders and pages are each sorted by name. */
export function buildTree(notes: NoteMeta[]): FolderNode {
  const root: FolderNode = { name: '', path: '', folders: [], notes: [] }
  const folderAt = (path: string): FolderNode => {
    let node = root
    for (const part of path ? path.split('/') : []) {
      const childPath = node.path ? `${node.path}/${part}` : part
      let child = node.folders.find((f) => f.name === part)
      if (!child) {
        child = { name: part, path: childPath, folders: [], notes: [] }
        node.folders.push(child)
      }
      node = child
    }
    return node
  }
  for (const n of notes) folderAt(n.folder).notes.push(n)

  const sort = (node: FolderNode) => {
    node.folders.sort((a, b) => a.name.localeCompare(b.name))
    node.notes.sort((a, b) => a.title.localeCompare(b.title))
    node.folders.forEach(sort)
  }
  sort(root)
  return root
}

/** The emoji a page has chosen as its icon, if any. */
export function pageEmoji(note: Pick<NoteMeta, 'frontmatter'>): string | undefined {
  const icon = note.frontmatter.icon
  return typeof icon === 'string' && icon.trim() ? icon.trim() : undefined
}
