import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FolderBackupProvider } from './backup/folderBackup'

describe('FolderBackupProvider', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'noteable-backup-'))
    await mkdir(join(dir, 'vault', '.noteable'), { recursive: true })
    await mkdir(join(dir, 'vault', '.trash'), { recursive: true })
    await writeFile(join(dir, 'vault', 'a.md'), 'a')
    await writeFile(join(dir, 'vault', '.noteable', 'state.json'), '{}')
    await writeFile(join(dir, 'vault', '.trash', 'old.md'), 'old')
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('copies the vault (minus trash) and prunes old snapshots', async () => {
    const provider = new FolderBackupProvider(join(dir, 'backups'), 2)
    const first = await provider.backup(join(dir, 'vault'))
    expect(first.files).toBe(2)
    expect((await readdir(first.destination)).sort()).toEqual(['.noteable', 'a.md'])

    await new Promise((r) => setTimeout(r, 5))
    await provider.backup(join(dir, 'vault'))
    await new Promise((r) => setTimeout(r, 5))
    await provider.backup(join(dir, 'vault'))
    expect((await readdir(join(dir, 'backups'))).length).toBe(2)
  })

  it('refuses to back up into the vault itself', async () => {
    const provider = new FolderBackupProvider(join(dir, 'vault', 'backups'))
    await expect(provider.backup(join(dir, 'vault'))).rejects.toThrow(/outside your vault/)
  })
})

