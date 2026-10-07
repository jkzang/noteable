// Extension points for cloud features. Nothing in the app depends on a
// provider being present: the vault on disk is always the source of truth.

import type { BackupResult } from '@shared/types'

/** Copies the vault somewhere safe. */
export interface BackupProvider {
  readonly id: string
  readonly displayName: string
  backup(vaultRoot: string): Promise<BackupResult>
}
