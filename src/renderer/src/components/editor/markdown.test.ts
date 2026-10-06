// @vitest-environment happy-dom
import { Editor } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { passageToMarkdown } from '@shared/esv'

// Same content extensions as NoteEditor (minus UI-only ones), to make sure
// what we save to disk is the Markdown we loaded.
const roundTrip = (md: string) => {
  const editor = new Editor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), Highlight, Markdown],
    content: md,
    contentType: 'markdown'
  })
  const out = editor.getMarkdown()
  editor.destroy()
  return out
}

describe('note Markdown', () => {
  it('round-trips the formatting the slash menu produces', () => {
    const md = [
      '# Heading',
      '',
      'Some **bold**, *italic*, ==highlighted== and [linked](https://esv.org) text.',
      '',
      '- [ ] open to-do',
      '- [x] done to-do',
      '',
      '1. first',
      '2. second',
      '',
      '---',
      '',
      '```',
      'code',
      '```'
    ].join('\n')
    expect(roundTrip(md).trim()).toBe(md)
  })

  it('round-trips an inserted ESV passage', () => {
    const md = passageToMarkdown({
      query: 'John 3:16',
      reference: 'John 3:16',
      verses: [{ number: 16, chapter: 3, text: 'For God so loved the world,' }],
      text: '',
      copyright: ''
    })
    expect(roundTrip(md).trim()).toBe(md)
  })
})
