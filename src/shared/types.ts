// Domain types shared by the main process (storage) and the renderer (UI).
// Everything here must be plain, JSON-serialisable data so it can cross IPC.

export type ISODateTime = string // "2026-10-06T14:30:00.000Z"

export interface NoteFrontmatter {
  title?: string
  created?: ISODateTime
  updated?: ISODateTime
  tags?: string[]
  /** Emoji shown before the title, Notion-style. */
  icon?: string
  /** Bible passage this note studies, e.g. "Romans 8:1–11". */
  passage?: string
  [key: string]: unknown
}

export interface NoteMeta {
  /** Vault-relative POSIX path, e.g. "Bible Study/Romans 8.md". Doubles as the note's id. */
  path: string
  title: string
  folder: string
  frontmatter: NoteFrontmatter
  mtime: number
}

export interface Note extends NoteMeta {
  /** Markdown body without the frontmatter block. */
  body: string
}

export interface VaultInfo {
  path: string
  name: string
}

export interface Settings {
  vaultPath?: string
  /** Stored encrypted at rest when the OS keychain is available. */
  esvApiKey?: string
  /** Folder a backup copies the vault into (point it at Dropbox/iCloud/Drive for an easy cloud backup). */
  backupDir?: string
  theme: 'system' | 'light' | 'dark'
}

export interface BiblePassage {
  query: string
  /** Canonical reference as returned by the ESV API, e.g. "Romans 8:1–4". */
  reference: string
  verses: { number: number | null; chapter?: number; text: string }[]
  /** Plain text of the whole passage (verse numbers inline as [n]). */
  text: string
  copyright: string
}

export interface BackupResult {
  destination: string
  files: number
  finishedAt: ISODateTime
}
