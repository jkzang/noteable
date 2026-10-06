import type { NoteableApi } from '@shared/api'
import { createMemoryApi } from './memoryApi'

/** True when running inside the Electron app (vs. the browser preview). */
export const isDesktop = typeof window !== 'undefined' && Boolean(window.noteable)

export const api: NoteableApi = window.noteable ?? createMemoryApi()
