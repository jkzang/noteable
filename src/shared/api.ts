// The contract between the renderer and whatever backend it is running on.
// In the desktop app it is implemented by the Electron main process and
// exposed through the preload script as `window.noteable`. In the browser
// (npm run dev:web) an in-memory implementation is used instead.

import type {
  BackupResult,
  BiblePassage,
  CalendarEvent,
  Note,
  NoteFrontmatter,
  NoteMeta,
  Project,
  Settings,
  Task,
  VaultInfo
} from './types'

export interface CreateNoteInput {
  title: string
  folder?: string
  body?: string
  frontmatter?: NoteFrontmatter
}

export interface NoteableApi {
  vault: {
    info(): Promise<VaultInfo>
    /** Opens a folder picker; resolves null if the user cancels. */
    choose(): Promise<VaultInfo | null>
    reveal(path?: string): Promise<void>
  }
  notes: {
    list(): Promise<NoteMeta[]>
    read(path: string): Promise<Note>
    create(input: CreateNoteInput): Promise<NoteMeta>
    write(path: string, body: string, frontmatter?: NoteFrontmatter): Promise<NoteMeta>
    /** Renames the file to match the new title; resolves to the new meta (path may change). */
    rename(path: string, title: string): Promise<NoteMeta>
    remove(path: string): Promise<void>
  }
  tasks: {
    list(): Promise<Task[]>
    upsert(task: Task): Promise<Task>
    remove(id: string): Promise<void>
  }
  projects: {
    list(): Promise<Project[]>
    upsert(project: Project): Promise<Project>
    remove(id: string): Promise<void>
  }
  events: {
    list(): Promise<CalendarEvent[]>
    upsert(event: CalendarEvent): Promise<CalendarEvent>
    remove(id: string): Promise<void>
  }
  settings: {
    get(): Promise<Settings>
    update(patch: Partial<Settings>): Promise<Settings>
  }
  bible: {
    passage(reference: string): Promise<BiblePassage>
  }
  backup: {
    run(): Promise<BackupResult>
    chooseDir(): Promise<string | null>
  }
}

/** Flattened IPC channel names, e.g. "notes.read". */
export type ApiChannel = {
  [N in keyof NoteableApi]: `${N & string}.${keyof NoteableApi[N] & string}`
}[keyof NoteableApi]

/** The function type behind a channel, e.g. ApiMethod<'notes.read'>. */
export type ApiMethod<C extends ApiChannel> = C extends `${infer N}.${infer M}`
  ? N extends keyof NoteableApi
    ? M extends keyof NoteableApi[N]
      ? NoteableApi[N][M]
      : never
    : never
  : never

export const API_CHANNELS: ApiChannel[] = [
  'vault.info',
  'vault.choose',
  'vault.reveal',
  'notes.list',
  'notes.read',
  'notes.create',
  'notes.write',
  'notes.rename',
  'notes.remove',
  'tasks.list',
  'tasks.upsert',
  'tasks.remove',
  'projects.list',
  'projects.upsert',
  'projects.remove',
  'events.list',
  'events.upsert',
  'events.remove',
  'settings.get',
  'settings.update',
  'bible.passage',
  'backup.run',
  'backup.chooseDir'
]
