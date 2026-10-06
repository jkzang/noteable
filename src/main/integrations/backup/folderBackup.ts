import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'node:path'
import type { BackupResult } from '@shared/types'
import type { BackupProvider } from '../types'

const PREFIX = 'Noteable Backup'

/**
 * Snapshot-copies the vault into a folder. Point that folder at Dropbox,
 * iCloud Drive, OneDrive or Google Drive for a zero-config cloud backup until
 * a native cloud backend exists. Keeps the newest `keep` snapshots.
 */
export class FolderBackupProvider implements BackupProvider {
  readonly id = 'folder'
  readonly displayName = 'Folder backup'

  constructor(
    private readonly targetDir: string,
    private readonly keep = 10
  ) {}

  async backup(vaultRoot: string): Promise<BackupResult> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const prefix = `${PREFIX} - ${basename(vaultRoot)} - `
    const destination = join(this.targetDir, `${prefix}${stamp}`)
    if ((resolve(this.targetDir) + sep).startsWith(resolve(vaultRoot) + sep)) {
      throw new Error('Choose a backup folder outside your vault.')
    }

    await mkdir(this.targetDir, { recursive: true })
    await cp(vaultRoot, destination, {
      recursive: true,
      filter: (src) => basename(src) !== '.trash' && !src.endsWith('.tmp')
    })
    const files = (await readdir(destination, { recursive: true, withFileTypes: true })).filter((e) =>
      e.isFile()
    ).length
    await this.prune(prefix)
    return { destination, files, finishedAt: new Date().toISOString() }
  }

  private async prune(prefix: string): Promise<void> {
    const snapshots = (await readdir(this.targetDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && e.name.startsWith(prefix))
      .map((e) => e.name)
      .sort() // ISO timestamps sort chronologically
    for (const old of snapshots.slice(0, Math.max(0, snapshots.length - this.keep))) {
      await rm(join(this.targetDir, old), { recursive: true, force: true })
    }
  }
}
