import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { format } from 'date-fns'
import { BookOpen, Clock, FolderOpen, MoreHorizontal, Smile, Tag, Trash2 } from 'lucide-react'
import type { Note } from '@shared/types'
import { IconPicker } from '@renderer/components/IconPicker'
import { PageIcon } from '@renderer/components/PageIcon'
import { MenuItem, Popover } from '@renderer/components/Popover'
import { NoteEditor } from '@renderer/components/editor/NoteEditor'
import { api, isDesktop } from '@renderer/lib/api'
import { pageEmoji } from '@renderer/lib/pages'
import { useAutosave } from '@renderer/lib/useAutosave'
import { timeAgo } from '@renderer/lib/timeAgo'
import { useStore } from '@renderer/store/useStore'

export function NoteView({ path }: { path: string }) {
  const [note, setNote] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const meta = useStore((s) => s.notes.find((n) => n.path === path))
  const noteSaved = useStore((s) => s.noteSaved)
  const deleteNote = useStore((s) => s.deleteNote)
  const navigate = useStore((s) => s.navigate)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<Editor | null>(null)
  // Latest Markdown from the (uncontrolled) editor, for frontmatter-only edits.
  const bodyRef = useRef('')

  useEffect(() => {
    let cancelled = false
    api.notes
      .read(path)
      .then((n) => {
        if (cancelled) return
        bodyRef.current = n.body
        setNote(n)
        setTitle(n.title)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [path])

  // Let the title wrap onto as many lines as it needs, like Notion.
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${el.scrollHeight}px`
  }, [title, note])

  const { schedule, flush } = useAutosave<string>(async (body) => {
    noteSaved(await api.notes.write(path, body))
  })

  const onChange = useCallback(
    (body: string) => {
      bodyRef.current = body
      schedule(body)
    },
    [schedule]
  )

  const onReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const commitTitle = async () => {
    const next = title.trim() || 'Untitled'
    if (!note || next === note.title) return setTitle(note?.title ?? next)
    await flush()
    // Renaming changes the path, which remounts this view on the new file.
    noteSaved(await api.notes.rename(path, next), path)
  }

  const setIcon = async (icon: string | undefined) => {
    setIconPickerOpen(false)
    if (!note) return
    await flush()
    const { icon: _old, ...rest } = note.frontmatter
    const frontmatter = icon ? { ...rest, icon } : rest
    const saved = await api.notes.write(path, bodyRef.current, frontmatter)
    setNote({ ...note, frontmatter: saved.frontmatter })
    noteSaved(saved)
  }

  if (error) return <div className="page empty-state">{error}</div>
  if (!note) return <div className="page" />

  const emoji = pageEmoji(note)
  const created = typeof note.frontmatter.created === 'string' ? new Date(note.frontmatter.created) : null
  const tags = Array.isArray(note.frontmatter.tags) ? note.frontmatter.tags : []
  const passage = note.frontmatter.passage ? String(note.frontmatter.passage) : null

  return (
    <div className="page">
      <header className="topbar">
        <div className="breadcrumb">
          {note.folder.split('/').filter(Boolean).map((part, i) => (
            <span key={i} className="crumb muted">
              {part}
              <span className="crumb-sep">/</span>
            </span>
          ))}
          <span className="crumb current">
            <PageIcon note={note} size={14} />
            <span className="crumb-title">{note.title || 'Untitled'}</span>
          </span>
        </div>
        <div className="spacer" />
        {meta && <span className="topbar-meta">Edited {timeAgo(meta.mtime)}</span>}
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          align="right"
          className="menu"
          anchor={
            <button className="icon-button small" title="More" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreHorizontal size={18} />
            </button>
          }
        >
          {isDesktop && (
            <MenuItem
              icon={<FolderOpen size={16} />}
              label="Show in folder"
              onClick={() => {
                setMenuOpen(false)
                void api.vault.reveal(path)
              }}
            />
          )}
          <MenuItem
            icon={<Trash2 size={16} />}
            label="Move to trash"
            danger
            onClick={() => {
              setMenuOpen(false)
              void deleteNote(path)
            }}
          />
        </Popover>
      </header>

      <div className="page-body">
        <div className="page-header">
          <Popover
            open={iconPickerOpen}
            onClose={() => setIconPickerOpen(false)}
            anchor={
              emoji ? (
                <button className="page-icon" title="Change icon" onClick={() => setIconPickerOpen(!iconPickerOpen)}>
                  {emoji}
                </button>
              ) : (
                <div className="page-controls">
                  <button className="text-button" onClick={() => setIconPickerOpen(!iconPickerOpen)}>
                    <Smile size={15} />
                    Add icon
                  </button>
                </div>
              )
            }
          >
            <IconPicker onPick={(e) => void setIcon(e)} onRemove={emoji ? () => void setIcon(undefined) : undefined} />
          </Popover>

          <textarea
            ref={titleRef}
            className="page-title"
            rows={1}
            value={title}
            placeholder="Untitled"
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
            onBlur={() => void commitTitle()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                editorRef.current?.commands.focus('start')
              }
            }}
          />

          {(created || passage || tags.length > 0) && (
            <div className="properties">
              {created && (
                <div className="property">
                  <span className="property-name">
                    <Clock size={15} />
                    Created
                  </span>
                  <span className="property-value">{format(created, 'MMMM d, yyyy h:mm a')}</span>
                </div>
              )}
              {passage && (
                <div className="property">
                  <span className="property-name">
                    <BookOpen size={15} />
                    Passage
                  </span>
                  <button className="property-value link" onClick={() => navigate({ kind: 'bible', reference: passage })}>
                    {passage}
                  </button>
                </div>
              )}
              {tags.length > 0 && (
                <div className="property">
                  <span className="property-name">
                    <Tag size={15} />
                    Tags
                  </span>
                  <span className="property-value">
                    {tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <NoteEditor markdown={note.body} onChange={onChange} onReady={onReady} />
      </div>
    </div>
  )
}
