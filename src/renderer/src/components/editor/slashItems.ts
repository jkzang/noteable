import type { Editor, Range } from '@tiptap/core'
import { format } from 'date-fns'
import {
  BookOpen,
  CalendarDays,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  type LucideIcon
} from 'lucide-react'
import { parseReference, type BibleReference } from '@shared/bibleRef'
import { passageToMarkdown } from '@shared/esv'
import type { BiblePassage } from '@shared/types'
import { api } from '@renderer/lib/api'
import { useStore } from '@renderer/store/useStore'

export interface SlashItem {
  title: string
  description: string
  icon: LucideIcon
  keywords: string[]
  /** Markdown shortcut shown as a hint, Notion-style. */
  shortcut?: string
  /** Menu section heading; defaults to "Basic blocks". */
  group?: string
  run(editor: Editor, range: Range): void
}

const chain = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range)

const insertPassage = (editor: Editor, passage: BiblePassage) =>
  editor.chain().focus().insertContent(passageToMarkdown(passage) + '\n\n', { contentType: 'markdown' }).run()

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Text',
    description: 'Plain paragraph',
    icon: Pilcrow,
    keywords: ['paragraph', 'p'],
    run: (e, r) => chain(e, r).setParagraph().run()
  },
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: Heading1,
    keywords: ['h1', 'title'],
    shortcut: '#',
    run: (e, r) => chain(e, r).setNode('heading', { level: 1 }).run()
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    keywords: ['h2', 'subtitle'],
    shortcut: '##',
    run: (e, r) => chain(e, r).setNode('heading', { level: 2 }).run()
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3,
    keywords: ['h3'],
    shortcut: '###',
    run: (e, r) => chain(e, r).setNode('heading', { level: 3 }).run()
  },
  {
    title: 'Bulleted list',
    description: 'Simple bulleted list',
    icon: List,
    keywords: ['ul', 'bullet', 'unordered'],
    shortcut: '-',
    run: (e, r) => chain(e, r).toggleBulletList().run()
  },
  {
    title: 'Numbered list',
    description: 'List with numbering',
    icon: ListOrdered,
    keywords: ['ol', 'ordered', 'number'],
    shortcut: '1.',
    run: (e, r) => chain(e, r).toggleOrderedList().run()
  },
  {
    title: 'To-do list',
    description: 'Track tasks with checkboxes',
    icon: ListChecks,
    keywords: ['todo', 'task', 'checkbox', 'check'],
    shortcut: '[]',
    run: (e, r) => chain(e, r).toggleTaskList().run()
  },
  {
    title: 'Bible passage',
    description: 'Insert an ESV passage as a quote',
    icon: BookOpen,
    keywords: ['bible', 'passage', 'verse', 'scripture', 'esv'],
    run: (e, r) => {
      chain(e, r).run()
      useStore.getState().pickPassage((passage) => insertPassage(e, passage))
    }
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: Quote,
    keywords: ['blockquote', 'citation'],
    shortcut: '>',
    run: (e, r) => chain(e, r).toggleBlockquote().run()
  },
  {
    title: 'Code',
    description: 'Code block with monospace text',
    icon: Code2,
    keywords: ['codeblock', 'pre', 'snippet'],
    shortcut: '```',
    run: (e, r) => chain(e, r).toggleCodeBlock().run()
  },
  {
    title: 'Divider',
    description: 'Visually divide blocks',
    icon: Minus,
    keywords: ['hr', 'rule', 'separator', 'line'],
    shortcut: '---',
    run: (e, r) => chain(e, r).setHorizontalRule().run()
  },
  {
    title: 'Highlight',
    description: 'Highlight the next text you type',
    icon: Highlighter,
    keywords: ['mark', 'color'],
    shortcut: '==',
    run: (e, r) => chain(e, r).toggleHighlight().run()
  },
  {
    title: 'Date',
    description: "Insert today's date",
    icon: CalendarDays,
    keywords: ['today', 'now', 'time'],
    run: (e, r) => chain(e, r).insertContent(format(new Date(), 'EEEE, MMMM d, yyyy')).run()
  }
]

/** "/Matthew 12:13-24" → an item that fetches the passage and inserts it as a quote. */
function referenceItem(ref: BibleReference): SlashItem {
  return {
    title: ref.label,
    description: 'Insert this passage (ESV)',
    icon: BookOpen,
    keywords: [],
    group: 'Bible',
    run: (e, r) => {
      chain(e, r).run()
      api.bible.passage(ref.query).then(
        (passage) => insertPassage(e, passage),
        (err: Error) => useStore.getState().notify(err.message)
      )
    }
  }
}

export function filterSlashItems(query: string): SlashItem[] {
  const ref = parseReference(query)
  const q = query.toLowerCase().trim()
  const blocks = q
    ? SLASH_ITEMS.filter((item) => item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.startsWith(q)))
    : SLASH_ITEMS
  return ref ? [referenceItem(ref), ...blocks] : blocks
}
