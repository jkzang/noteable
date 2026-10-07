import { describe, expect, it } from 'vitest'
import type { NoteMeta } from '@shared/types'
import { buildTree, pageEmoji } from './pages'

const note = (path: string, frontmatter: NoteMeta['frontmatter'] = {}): NoteMeta => {
  const i = path.lastIndexOf('/')
  return { path, title: path.slice(i + 1, -3), folder: i === -1 ? '' : path.slice(0, i), frontmatter, mtime: 0 }
}

describe('buildTree', () => {
  it('nests notes by folder and sorts each level', () => {
    const tree = buildTree([note('b.md'), note('Work/Q3/Plan.md'), note('a.md'), note('Work/Notes.md'), note('Archive/x.md')])
    expect(tree.notes.map((n) => n.title)).toEqual(['a', 'b'])
    expect(tree.folders.map((f) => f.path)).toEqual(['Archive', 'Work'])
    const work = tree.folders[1]
    expect(work.notes.map((n) => n.title)).toEqual(['Notes'])
    expect(work.folders.map((f) => [f.name, f.path])).toEqual([['Q3', 'Work/Q3']])
    expect(work.folders[0].notes.map((n) => n.path)).toEqual(['Work/Q3/Plan.md'])
  })
})

describe('pageEmoji', () => {
  it('returns a trimmed emoji, ignoring blanks and non-strings', () => {
    expect(pageEmoji(note('a.md', { icon: ' 💡 ' }))).toBe('💡')
    expect(pageEmoji(note('a.md', { icon: '' }))).toBeUndefined()
    expect(pageEmoji(note('a.md', { icon: 3 as unknown as string }))).toBeUndefined()
    expect(pageEmoji(note('a.md'))).toBeUndefined()
  })
})
