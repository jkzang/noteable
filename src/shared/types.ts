// Domain types shared by the main process (storage) and the renderer (UI).
// Everything here must be plain, JSON-serialisable data so it can cross IPC.

export type ISODate = string // "2026-10-06"
export type ISODateTime = string // "2026-10-06T14:30:00.000Z"

/** Todoist-style priority: 1 is most urgent, 4 is "no priority". */
export type Priority = 1 | 2 | 3 | 4

export interface Due {
  /** Calendar day the task is due. */
  date: ISODate
  /** Optional local wall-clock time, "HH:mm". */
  time?: string
  /** Human recurrence rule, e.g. "every day", "every monday". See shared/recurrence.ts. */
  recurrence?: string
}

/** IDs a record has in remote systems, keyed by provider id (e.g. "google-tasks"). */
export type ExternalIds = Record<string, string>

export interface Task {
  id: string
  content: string
  description?: string
  projectId?: string // undefined => Inbox
  priority: Priority
  due?: Due
  labels: string[]
  completed: boolean
  completedAt?: ISODateTime
  parentId?: string
  /** Vault-relative path of a linked note. */
  notePath?: string
  order: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
  external?: ExternalIds
}

export interface Project {
  id: string
  name: string
  color: string
  order: number
  favorite?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: ISODateTime
  end: ISODateTime
  allDay: boolean
  color?: string
  description?: string
  location?: string
  /** Which calendar this lives in. "local" until a sync provider owns it. */
  calendarId: string
  notePath?: string
  updatedAt: ISODateTime
  external?: ExternalIds
}

export interface NoteFrontmatter {
  title?: string
  created?: ISODateTime
  updated?: ISODateTime
  tags?: string[]
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
  weekStartsOn: 0 | 1
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
