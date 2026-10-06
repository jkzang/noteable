import { create } from 'zustand'
import type { CreateNoteInput } from '@shared/api'
import type { BiblePassage, CalendarEvent, NoteMeta, Project, Settings, Task, VaultInfo } from '@shared/types'
import { api } from '@renderer/lib/api'
import { describeDue } from '@renderer/lib/dates'
import { nextDue } from '@renderer/lib/recurrence'

export type View =
  | { kind: 'inbox' }
  | { kind: 'today' }
  | { kind: 'upcoming' }
  | { kind: 'calendar' }
  | { kind: 'bible'; reference?: string }
  | { kind: 'project'; id: string }
  | { kind: 'note'; path: string }

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & { content: string }

interface Toast {
  id: number
  message: string
  undo?: () => void
}

interface State {
  ready: boolean
  vault?: VaultInfo
  settings: Settings
  tasks: Task[]
  projects: Project[]
  events: CalendarEvent[]
  notes: NoteMeta[]
  view: View
  quickAddOpen: boolean
  settingsOpen: boolean
  /** When set, the passage picker is open and calls this with the chosen passage. */
  passagePicker: ((p: BiblePassage) => void) | null
  toast: Toast | null

  init(): Promise<void>
  navigate(view: View): void
  setQuickAdd(open: boolean): void
  setSettingsOpen(open: boolean): void
  pickPassage(onPick: (p: BiblePassage) => void): void
  closePassagePicker(): void
  notify(message: string, undo?: () => void): void

  addTask(input: NewTask): Promise<Task>
  updateTask(id: string, patch: Partial<Task>): Promise<void>
  toggleTask(id: string): Promise<void>
  deleteTask(id: string): Promise<void>

  addProject(name: string, color: string): Promise<Project>
  deleteProject(id: string): Promise<void>

  saveEvent(event: CalendarEvent): Promise<void>
  deleteEvent(id: string): Promise<void>

  refreshNotes(): Promise<void>
  createNote(input: CreateNoteInput, open?: boolean): Promise<NoteMeta>
  noteSaved(meta: NoteMeta, previousPath?: string): void
  deleteNote(path: string): Promise<void>

  updateSettings(patch: Partial<Settings>): Promise<void>
  switchVault(): Promise<void>
}

const now = () => new Date().toISOString()

export const useStore = create<State>((set, get) => ({
  ready: false,
  settings: { theme: 'system', weekStartsOn: 0 },
  tasks: [],
  projects: [],
  events: [],
  notes: [],
  view: { kind: 'today' },
  quickAddOpen: false,
  settingsOpen: false,
  passagePicker: null,
  toast: null,

  async init() {
    const [vault, settings, tasks, projects, events, notes] = await Promise.all([
      api.vault.info(),
      api.settings.get(),
      api.tasks.list(),
      api.projects.list(),
      api.events.list(),
      api.notes.list()
    ])
    set({ ready: true, vault, settings, tasks, projects, events, notes })
  },

  navigate: (view) => set({ view }),
  setQuickAdd: (open) => set({ quickAddOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  pickPassage: (onPick) => set({ passagePicker: onPick }),
  closePassagePicker: () => set({ passagePicker: null }),
  notify: (message, undo) => set({ toast: { id: Date.now(), message, undo } }),

  async addTask(input) {
    const siblings = get().tasks.filter((t) => t.projectId === input.projectId)
    const task: Task = {
      priority: 4,
      labels: [],
      completed: false,
      order: siblings.length,
      ...input,
      id: crypto.randomUUID(),
      createdAt: now(),
      updatedAt: now()
    }
    set({ tasks: [...get().tasks, task] })
    await api.tasks.upsert(task)
    return task
  },

  async updateTask(id, patch) {
    const prev = get().tasks.find((t) => t.id === id)
    if (!prev) return
    const next = { ...prev, ...patch, updatedAt: now() }
    set({ tasks: get().tasks.map((t) => (t.id === id ? next : t)) })
    await api.tasks.upsert(next)
  },

  async toggleTask(id) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const { updateTask, notify } = get()

    // Recurring tasks roll forward instead of completing, like Todoist.
    const rolled = !task.completed && task.due ? nextDue(task.due) : null
    if (rolled) {
      await updateTask(id, { due: rolled })
      notify(`Next: ${describeDue(rolled).label}`, () => updateTask(id, { due: task.due }))
      return
    }
    const completed = !task.completed
    await updateTask(id, { completed, completedAt: completed ? now() : undefined })
    if (completed) notify('1 task completed', () => updateTask(id, { completed: false, completedAt: undefined }))
  },

  async deleteTask(id) {
    const task = get().tasks.find((t) => t.id === id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
    await api.tasks.remove(id)
    if (task) {
      get().notify('Task deleted', async () => {
        set({ tasks: [...get().tasks, task] })
        await api.tasks.upsert(task)
      })
    }
  },

  async addProject(name, color) {
    const project: Project = { id: crypto.randomUUID(), name, color, order: get().projects.length }
    set({ projects: [...get().projects, project] })
    await api.projects.upsert(project)
    return project
  },

  async deleteProject(id) {
    // Tasks in a deleted project fall back to the Inbox rather than vanishing.
    const orphaned = get().tasks.filter((t) => t.projectId === id)
    await Promise.all(orphaned.map((t) => get().updateTask(t.id, { projectId: undefined })))
    set({ projects: get().projects.filter((p) => p.id !== id) })
    await api.projects.remove(id)
    if (get().view.kind === 'project') set({ view: { kind: 'inbox' } })
  },

  async saveEvent(event) {
    const next = { ...event, updatedAt: now() }
    const exists = get().events.some((e) => e.id === event.id)
    set({ events: exists ? get().events.map((e) => (e.id === event.id ? next : e)) : [...get().events, next] })
    await api.events.upsert(next)
  },

  async deleteEvent(id) {
    set({ events: get().events.filter((e) => e.id !== id) })
    await api.events.remove(id)
  },

  async refreshNotes() {
    set({ notes: await api.notes.list() })
  },

  async createNote(input, open = true) {
    const meta = await api.notes.create(input)
    set({ notes: [meta, ...get().notes] })
    if (open) set({ view: { kind: 'note', path: meta.path } })
    return meta
  },

  noteSaved(meta, previousPath) {
    const key = previousPath ?? meta.path
    const notes = get().notes.some((n) => n.path === key)
      ? get().notes.map((n) => (n.path === key ? meta : n))
      : [meta, ...get().notes]
    set({ notes })
    const view = get().view
    if (previousPath && view.kind === 'note' && view.path === previousPath) {
      set({ view: { kind: 'note', path: meta.path } })
    }
  },

  async deleteNote(path) {
    await api.notes.remove(path)
    set({ notes: get().notes.filter((n) => n.path !== path) })
    const view = get().view
    if (view.kind === 'note' && view.path === path) set({ view: { kind: 'today' } })
    get().notify('Note moved to .trash')
  },

  async updateSettings(patch) {
    set({ settings: await api.settings.update(patch) })
  },

  async switchVault() {
    const vault = await api.vault.choose()
    if (!vault) return
    set({ ready: false, view: { kind: 'today' } })
    await get().init()
  }
}))
