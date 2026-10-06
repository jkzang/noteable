// Extension points for cloud features. Nothing in the app depends on a
// provider being present: the vault on disk is always the source of truth and
// providers sync *to* it.

import type { BackupResult, CalendarEvent, Task } from '@shared/types'

/** Copies the vault somewhere safe. */
export interface BackupProvider {
  readonly id: string
  readonly displayName: string
  backup(vaultRoot: string): Promise<BackupResult>
}

export interface SyncChanges<T> {
  upserted: T[]
  deletedIds: string[]
  /** Opaque token to pass to the next pull (e.g. Google's syncToken). */
  cursor?: string
}

/**
 * Two-way sync of one record type with a remote service.
 * Local records remember their remote id in `external[provider.id]`.
 */
export interface SyncProvider<T> {
  readonly id: string
  readonly displayName: string
  isConnected(): Promise<boolean>
  connect(): Promise<void>
  disconnect(): Promise<void>
  pull(cursor?: string): Promise<SyncChanges<T>>
  push(changes: { upserted: T[]; deleted: T[] }): Promise<void>
}

export type CalendarSyncProvider = SyncProvider<CalendarEvent>
export type TaskSyncProvider = SyncProvider<Task>
