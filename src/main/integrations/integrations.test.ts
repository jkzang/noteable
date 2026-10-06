import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '@shared/types'
import { FolderBackupProvider } from './backup/folderBackup'
import { fromGoogleEvent, fromGoogleTask, toGoogleEvent, toGoogleTask } from './google/mappers'

describe('FolderBackupProvider', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'noteable-backup-'))
    await mkdir(join(dir, 'vault', '.noteable'), { recursive: true })
    await mkdir(join(dir, 'vault', '.trash'), { recursive: true })
    await writeFile(join(dir, 'vault', 'a.md'), 'a')
    await writeFile(join(dir, 'vault', '.noteable', 'tasks.json'), '[]')
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

describe('Google mappers', () => {
  it('maps timed and all-day calendar events both ways', () => {
    const timed = fromGoogleEvent(
      {
        id: 'g1',
        summary: 'Small group',
        start: { dateTime: '2026-10-07T19:00:00-05:00' },
        end: { dateTime: '2026-10-07T20:30:00-05:00' }
      },
      'primary'
    )
    expect(timed).toMatchObject({
      title: 'Small group',
      allDay: false,
      start: '2026-10-08T00:00:00.000Z',
      external: { 'google-calendar': 'g1' }
    })
    expect(toGoogleEvent(timed)).toMatchObject({ id: 'g1', start: { dateTime: timed.start } })

    const allDay = fromGoogleEvent({ id: 'g2', start: { date: '2026-10-10' }, end: { date: '2026-10-11' } }, 'primary')
    expect(allDay.allDay).toBe(true)
    expect(toGoogleEvent(allDay).start).toEqual({ date: '2026-10-10' })
  })

  it('keeps local-only task fields when syncing from Google Tasks', () => {
    const local: Task = {
      id: 'local',
      content: 'Old',
      priority: 1,
      labels: ['devotional'],
      completed: false,
      order: 3,
      due: { date: '2026-10-06', time: '07:00', recurrence: 'every day' },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    }
    const merged = fromGoogleTask(
      { id: 'gt', title: 'Read Psalm 1', status: 'completed', due: '2026-10-07T00:00:00.000Z' },
      local
    )
    expect(merged).toMatchObject({
      id: 'local',
      content: 'Read Psalm 1',
      completed: true,
      priority: 1,
      labels: ['devotional'],
      due: { date: '2026-10-07', time: '07:00', recurrence: 'every day' },
      external: { 'google-tasks': 'gt' }
    })
    expect(toGoogleTask(merged)).toMatchObject({ id: 'gt', status: 'completed', due: '2026-10-07T00:00:00.000Z' })
  })
})
