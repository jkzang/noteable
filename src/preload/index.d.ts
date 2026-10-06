import type { NoteableApi } from '../shared/api'

declare global {
  interface Window {
    /** Present in the desktop app; undefined when the renderer runs in a plain browser. */
    noteable?: NoteableApi
  }
}

export {}
