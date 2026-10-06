import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { BookOpen, FolderOpen, Trash2 } from 'lucide-react'
import type { Note } from '@shared/types'
import { NoteEditor } from '@renderer/components/editor/NoteEditor'
import { api, isDesktop } from '@renderer/lib/api'
import { useAutosave } from '@renderer/lib/useAutosave'
import { useStore } from '@renderer/store/useStore'

export function NoteView({ path }: { path: string }) {
  const [note, setNote] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const noteSaved = useStore((s) => s.noteSaved)
  const deleteNote = useStore((s) => s.deleteNote)
  const navigate = useStore((s) => s.navigate)

  useEffect(() => {
    let cancelled = false
    api.notes
      .read(path)
      .then((n) => {
        if (cancelled) return
        setNote(n)
        setTitle(n.title)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [path])

  const { schedule, flush } = useAutosave<string>(async (body) => {
    noteSaved(await api.notes.write(path, body))
  })

  const commitTitle = async () => {
    const next = title.trim() || 'Untitled'
    if (!note || next === note.title) return setTitle(note?.title ?? next)
    await flush()
    // Renaming changes the path, which remounts this view on the new file.
    noteSaved(await api.notes.rename(path, next), path)
  }

  if (error) return <div className="view empty-state">{error}</div>
  if (!note) return <div className="view" />

  const created = typeof note.frontmatter.created === 'string' ? new Date(note.frontmatter.created) : null

  return (
    <div className="view note-view">
      <div className="note-toolbar">
        <span className="breadcrumb">{note.folder ? `${note.folder} /` : 'Notes /'}</span>
        <div className="spacer" />
        {isDesktop && (
          <button className="icon-button" title="Show in folder" onClick={() => void api.vault.reveal(path)}>
            <FolderOpen size={17} />
          </button>
        )}
        <button className="icon-button" title="Delete note" onClick={() => void deleteNote(path)}>
          <Trash2 size={17} />
        </button>
      </div>

      <input
        className="note-title"
        value={title}
        placeholder="Untitled"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => void commitTitle()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />

      <div className="note-meta">
        {note.frontmatter.passage && (
          <button
            className="chip passage-chip"
            onClick={() => navigate({ kind: 'bible', reference: String(note.frontmatter.passage) })}
          >
            <BookOpen size={13} />
            {String(note.frontmatter.passage)}
          </button>
        )}
        {created && <span className="muted">Created {format(created, 'MMM d, yyyy')}</span>}
        {(Array.isArray(note.frontmatter.tags) ? note.frontmatter.tags : []).map((t) => (
          <span key={t} className="task-label">
            #{t}
          </span>
        ))}
      </div>

      <NoteEditor markdown={note.body} onChange={schedule} />
    </div>
  )
}
