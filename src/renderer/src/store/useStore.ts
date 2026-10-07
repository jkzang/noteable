import { create } from 'zustand'
import type { CreateNoteInput } from '@shared/api'
import type { BiblePassage, NoteMeta, Settings, VaultInfo } from '@shared/types'
import { api } from '@renderer/lib/api'

export type View = { kind: 'home' } | { kind: 'bible'; reference?: string } | { kind: 'note'; path: string }

interface Toast {
  id: number
  message: string
  undo?: () => void
}

interface State {
  ready: boolean
  vault?: VaultInfo
  settings: Settings
  notes: NoteMeta[]
  view: View
  searchOpen: boolean
  settingsOpen: boolean
  /** When set, the passage picker is open and calls this with the chosen passage. */
  passagePicker: ((p: BiblePassage) => void) | null
  toast: Toast | null

  init(): Promise<void>
  navigate(view: View): void
  setSearchOpen(open: boolean): void
  setSettingsOpen(open: boolean): void
  pickPassage(onPick: (p: BiblePassage) => void): void
  closePassagePicker(): void
  notify(message: string, undo?: () => void): void

  refreshNotes(): Promise<void>
  createNote(input: CreateNoteInput, open?: boolean): Promise<NoteMeta>
  noteSaved(meta: NoteMeta, previousPath?: string): void
  deleteNote(path: string): Promise<void>

  updateSettings(patch: Partial<Settings>): Promise<void>
  switchVault(): Promise<void>
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  settings: { theme: 'system' },
  notes: [],
  view: { kind: 'home' },
  searchOpen: false,
  settingsOpen: false,
  passagePicker: null,
  toast: null,

  async init() {
    const [vault, settings, notes] = await Promise.all([api.vault.info(), api.settings.get(), api.notes.list()])
    set({ ready: true, vault, settings, notes })
  },

  navigate: (view) => set({ view }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  pickPassage: (onPick) => set({ passagePicker: onPick }),
  closePassagePicker: () => set({ passagePicker: null }),
  notify: (message, undo) => set({ toast: { id: Date.now(), message, undo } }),

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
    if (view.kind === 'note' && view.path === path) set({ view: { kind: 'home' } })
    get().notify('Page moved to .trash')
  },

  async updateSettings(patch) {
    set({ settings: await api.settings.update(patch) })
  },

  async switchVault() {
    const vault = await api.vault.choose()
    if (!vault) return
    set({ ready: false, view: { kind: 'home' } })
    await get().init()
  }
}))
