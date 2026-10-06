// A browser-only implementation of NoteableApi used by `npm run dev:web`.
// It mirrors the desktop behaviour closely enough for UI work and keeps its
// data in localStorage (when available) instead of a vault on disk.

import type { CreateNoteInput, NoteableApi } from '@shared/api'
import { buildEsvUrl, ESV_COPYRIGHT, toPassage, type EsvTextResponse } from '@shared/esv'
import { basename, dirname, joinPath, titleToFileName } from '@shared/filenames'
import type { BiblePassage, CalendarEvent, Note, NoteFrontmatter, NoteMeta, Project, Settings, Task } from '@shared/types'
import { toISODate } from './dates'

interface StoredNote {
  body: string
  frontmatter: NoteFrontmatter
  mtime: number
}

interface MemoryState {
  notes: Record<string, StoredNote>
  tasks: Task[]
  projects: Project[]
  events: CalendarEvent[]
  settings: Settings
}

const STORAGE_KEY = 'noteable:web-vault'

// Sample passage so the Bible view can be explored without an API key.
const SAMPLE_PSALM_23: BiblePassage = {
  query: 'Psalm 23',
  reference: 'Psalm 23',
  verses: [
    'The LORD is my shepherd; I shall not want.',
    'He makes me lie down in green pastures. He leads me beside still waters.',
    'He restores my soul. He leads me in paths of righteousness for his name’s sake.',
    'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',
    'You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows.',
    'Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the LORD forever.'
  ].map((text, i) => ({ number: i + 1, chapter: 23, text })),
  text: '',
  copyright: ESV_COPYRIGHT
}

function seed(): MemoryState {
  const now = new Date().toISOString()
  const today = toISODate(new Date())
  const bible: Project = { id: crypto.randomUUID(), name: 'Bible Study', color: '#7ecc49', order: 0 }
  const home: Project = { id: crypto.randomUUID(), name: 'Home', color: '#4073ff', order: 1 }
  const task = (t: Partial<Task> & { content: string }, order: number): Task => ({
    id: crypto.randomUUID(),
    priority: 4,
    labels: [],
    completed: false,
    order,
    createdAt: now,
    updatedAt: now,
    ...t
  })
  return {
    notes: {
      'Welcome to Noteable.md': {
        frontmatter: { created: now },
        mtime: Date.now(),
        body:
          'This is the **browser preview** — data lives in localStorage. The desktop app stores everything as Markdown in a vault folder.\n\n' +
          "Type `/` for commands, or try Markdown shortcuts like `#`, `-`, `[]` and `>`.\n\n- [ ] Try the slash menu\n- [x] Open the app\n"
      },
      'Bible Study/Psalm 23.md': {
        frontmatter: { created: now, passage: 'Psalm 23', tags: ['bible'] },
        mtime: Date.now() - 1000,
        body: '## Observation\n\nThe shepherd *provides*, *leads* and *restores*.\n\n## Application\n\n'
      }
    },
    projects: [bible, home],
    tasks: [
      task({ content: 'Explore Noteable', priority: 1, due: { date: today } }, 0),
      task({ content: 'Read Psalm 1', projectId: bible.id, labels: ['devotional'], due: { date: today, time: '07:00', recurrence: 'every day' } }, 1),
      task({ content: 'Prepare small group questions', description: 'Romans 8', projectId: bible.id, priority: 2, due: { date: toISODate(new Date(Date.now() + 86400000)) } }, 2),
      task({ content: 'Fix the garden gate', projectId: home.id, priority: 3 }, 3)
    ],
    events: [
      {
        id: crypto.randomUUID(),
        title: 'Small group',
        start: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
        end: new Date(new Date().setHours(20, 30, 0, 0)).toISOString(),
        allDay: false,
        calendarId: 'local',
        color: '#7ecc49',
        updatedAt: now
      }
    ],
    settings: { theme: 'system', weekStartsOn: 0 }
  }
}

export function createMemoryApi(): NoteableApi {
  let state: MemoryState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    state = raw ? JSON.parse(raw) : seed()
  } catch {
    state = seed()
  }
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable (private mode etc.) — keep working in memory.
    }
  }

  const meta = (path: string): NoteMeta => {
    const n = state.notes[path]
    if (!n) throw new Error(`Note not found: ${path}`)
    return {
      path,
      title: typeof n.frontmatter.title === 'string' ? n.frontmatter.title : basename(path),
      folder: dirname(path),
      frontmatter: n.frontmatter,
      mtime: n.mtime
    }
  }
  const uniquePath = (folder: string, title: string) => {
    const base = titleToFileName(title)
    for (let i = 0; ; i++) {
      const p = joinPath(folder, i === 0 ? `${base}.md` : `${base} ${i}.md`)
      if (!state.notes[p]) return p
    }
  }
  const collection = <T extends { id: string }>(key: 'tasks' | 'projects' | 'events') => ({
    list: async () => [...(state[key] as unknown as T[])],
    upsert: async (item: T) => {
      const list = state[key] as unknown as T[]
      const i = list.findIndex((x) => x.id === item.id)
      if (i === -1) list.push(item)
      else list[i] = item
      save()
      return item
    },
    remove: async (id: string) => {
      ;(state as unknown as Record<string, T[]>)[key] = (state[key] as unknown as T[]).filter((x) => x.id !== id)
      save()
    }
  })

  return {
    vault: {
      info: async () => ({ path: '(browser storage)', name: 'Browser preview' }),
      choose: async () => null,
      reveal: async () => {}
    },
    notes: {
      list: async () => Object.keys(state.notes).map(meta).sort((a, b) => b.mtime - a.mtime),
      read: async (path): Promise<Note> => ({ ...meta(path), body: state.notes[path].body }),
      create: async (input: CreateNoteInput) => {
        const path = uniquePath(input.folder ?? '', input.title)
        const fm: NoteFrontmatter = { ...input.frontmatter, created: new Date().toISOString() }
        if (titleToFileName(input.title) !== input.title) fm.title = input.title
        state.notes[path] = { body: input.body ?? '', frontmatter: fm, mtime: Date.now() }
        save()
        return meta(path)
      },
      write: async (path, body, frontmatter) => {
        const prev = state.notes[path]
        state.notes[path] = { body, frontmatter: frontmatter ?? prev?.frontmatter ?? {}, mtime: Date.now() }
        save()
        return meta(path)
      },
      rename: async (path, title) => {
        const note = state.notes[path]
        const fm = { ...note.frontmatter }
        if (titleToFileName(title) === title) delete fm.title
        else fm.title = title
        let next = path
        if (titleToFileName(title) !== basename(path)) {
          next = uniquePath(dirname(path), title)
          delete state.notes[path]
        }
        state.notes[next] = { ...note, frontmatter: fm, mtime: Date.now() }
        save()
        return meta(next)
      },
      remove: async (path) => {
        delete state.notes[path]
        save()
      }
    },
    tasks: collection<Task>('tasks'),
    projects: collection<Project>('projects'),
    events: collection<CalendarEvent>('events'),
    settings: {
      get: async () => state.settings,
      update: async (patch) => {
        state.settings = { ...state.settings, ...patch }
        save()
        return state.settings
      }
    },
    bible: {
      passage: async (reference) => {
        const key = state.settings.esvApiKey
        if (!key) {
          if (/^ps(alm)?s?\.?\s*23\b/i.test(reference.trim())) return SAMPLE_PSALM_23
          throw new Error('Browser preview: add an ESV API key in Settings, or try "Psalm 23" for a sample.')
        }
        const res = await fetch(buildEsvUrl(reference), { headers: { Authorization: `Token ${key}` } })
        if (!res.ok) throw new Error(`ESV API error (${res.status}).`)
        return toPassage((await res.json()) as EsvTextResponse)
      }
    },
    backup: {
      run: async () => {
        throw new Error('Backups are available in the desktop app.')
      },
      chooseDir: async () => null
    }
  }
}
