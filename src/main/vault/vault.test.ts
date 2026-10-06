import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '@shared/types'
import { parseNote, serializeNote } from './frontmatter'
import { Vault } from './vault'

let root: string
let vault: Vault

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'noteable-test-'))
  vault = (await Vault.open(root)).vault
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('frontmatter', () => {
  it('round-trips frontmatter and body', () => {
    const raw = serializeNote({ passage: 'John 3:16', tags: ['bible'] }, '# Hi\n\nBody')
    expect(raw).toBe('---\npassage: John 3:16\ntags:\n  - bible\n---\n\n# Hi\n\nBody')
    expect(parseNote(raw)).toEqual({ frontmatter: { passage: 'John 3:16', tags: ['bible'] }, body: '# Hi\n\nBody' })
  })

  it('leaves notes without frontmatter untouched', () => {
    expect(parseNote('just text')).toEqual({ frontmatter: {}, body: 'just text' })
    expect(serializeNote({}, 'just text')).toBe('just text')
  })

  it('keeps malformed YAML as body text instead of dropping it', () => {
    const raw = '---\n: [oops\n---\nbody'
    expect(parseNote(raw)).toEqual({ frontmatter: {}, body: raw })
  })
})

describe('Vault notes', () => {
  it('creates, lists and reads Markdown files', async () => {
    const meta = await vault.createNote({ title: 'Romans 8:1–11', folder: 'Bible Study', body: 'Notes', frontmatter: { passage: 'Romans 8:1–11' } })
    expect(meta.path).toBe('Bible Study/Romans 8 1–11.md')
    expect(meta.title).toBe('Romans 8:1–11') // colon kept via frontmatter title
    expect(meta.folder).toBe('Bible Study')

    const raw = await readFile(join(root, meta.path), 'utf8')
    expect(raw).toContain('passage: Romans 8:1–11')
    expect(raw.endsWith('Notes')).toBe(true)

    const list = await vault.listNotes()
    expect(list.map((n) => n.path)).toEqual(['Bible Study/Romans 8 1–11.md'])
    expect((await vault.readNote(meta.path)).body).toBe('Notes')
  })

  it('picks unique file names', async () => {
    const a = await vault.createNote({ title: 'Idea' })
    const b = await vault.createNote({ title: 'Idea' })
    expect([a.path, b.path]).toEqual(['Idea.md', 'Idea 1.md'])
  })

  it('preserves frontmatter when only the body is written', async () => {
    const meta = await vault.createNote({ title: 'Study', frontmatter: { passage: 'Psalm 1' } })
    await vault.writeNote(meta.path, 'Updated body')
    const note = await vault.readNote(meta.path)
    expect(note.body).toBe('Updated body')
    expect(note.frontmatter.passage).toBe('Psalm 1')
  })

  it('renames the file to follow the title', async () => {
    const meta = await vault.createNote({ title: 'Draft', body: 'x' })
    const renamed = await vault.renameNote(meta.path, 'Final')
    expect(renamed.path).toBe('Final.md')
    expect((await vault.readNote('Final.md')).body).toBe('x')
    await expect(vault.readNote('Draft.md')).rejects.toThrow()
  })

  it('moves deleted notes to .trash and hides dot-folders from the list', async () => {
    const meta = await vault.createNote({ title: 'Gone' })
    await vault.removeNote(meta.path)
    expect(await vault.listNotes()).toEqual([])
    expect((await readdir(join(root, '.trash'))).length).toBe(1)
  })

  it('reads hand-written files from other tools', async () => {
    await writeFile(join(root, 'From Obsidian.md'), '# Hello\n')
    const [note] = await vault.listNotes()
    expect(note.title).toBe('From Obsidian')
    expect(note.frontmatter).toEqual({})
  })

  it('refuses paths outside the vault', async () => {
    await expect(vault.readNote('../secrets.md')).rejects.toThrow(/outside the vault/)
    await expect(vault.writeNote('../../evil.md', 'x')).rejects.toThrow(/outside the vault/)
  })
})

describe('Vault collections', () => {
  it('persists tasks to .noteable/tasks.json', async () => {
    const task: Task = {
      id: 't1',
      content: 'Read Psalm 1',
      priority: 2,
      labels: [],
      completed: false,
      order: 0,
      createdAt: '2026-10-06T00:00:00.000Z',
      updatedAt: '2026-10-06T00:00:00.000Z'
    }
    await vault.tasks.upsert(task)
    await vault.tasks.upsert({ ...task, id: 't2' })
    await vault.tasks.remove('t2')

    const reopened = (await Vault.open(root)).vault
    expect(await reopened.tasks.list()).toEqual([task])
    expect(JSON.parse(await readFile(join(root, '.noteable', 'tasks.json'), 'utf8'))).toEqual([task])
  })

  it('reports whether the vault is new', async () => {
    expect((await Vault.open(root)).isNew).toBe(false)
    const fresh = await mkdtemp(join(tmpdir(), 'noteable-fresh-'))
    expect((await Vault.open(fresh)).isNew).toBe(true)
    await rm(fresh, { recursive: true, force: true })
  })
})
