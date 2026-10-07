import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import clsx from 'clsx'
import { BookOpen, NotebookPen, Quote, Search } from 'lucide-react'
import { citeVerses, ESV_SHORT_COPYRIGHT, passageToMarkdown } from '@shared/esv'
import type { BiblePassage, Note } from '@shared/types'
import { PageIcon } from '@renderer/components/PageIcon'
import { NoteEditor } from '@renderer/components/editor/NoteEditor'
import { api } from '@renderer/lib/api'
import { useAutosave } from '@renderer/lib/useAutosave'
import { useStore } from '@renderer/store/useStore'

const STUDY_FOLDER = 'Bible Study'

/** Inductive study template: Observation → Interpretation → Application. */
function studyTemplate(p: BiblePassage): string {
  return [
    passageToMarkdown(p),
    '',
    '## Observation',
    '',
    'What does the text say?',
    '',
    '## Interpretation',
    '',
    'What does it mean?',
    '',
    '## Application',
    '',
    'How should I respond?',
    '',
    '## Prayer',
    ''
  ].join('\n')
}

const normalise = (ref: string) => ref.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()

export function BibleView({ initialReference }: { initialReference?: string }) {
  const notes = useStore((s) => s.notes)
  const createNote = useStore((s) => s.createNote)
  const navigate = useStore((s) => s.navigate)

  const [query, setQuery] = useState(initialReference ?? '')
  const [passage, setPassage] = useState<BiblePassage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const studies = useMemo(
    () => notes.filter((n) => n.frontmatter.passage).sort((a, b) => b.mtime - a.mtime),
    [notes]
  )
  const existing = passage
    ? studies.find((n) => normalise(String(n.frontmatter.passage)) === normalise(passage.reference))
    : undefined

  const lookup = useCallback(async (ref: string) => {
    if (!ref.trim()) return
    setLoading(true)
    setError(null)
    setSelected(new Set())
    try {
      setPassage(await api.bible.passage(ref))
    } catch (err) {
      setPassage(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialReference) {
      setQuery(initialReference)
      void lookup(initialReference)
    }
  }, [initialReference, lookup])

  const startStudy = async () => {
    if (!passage) return
    await createNote(
      {
        title: passage.reference,
        folder: STUDY_FOLDER,
        body: studyTemplate(passage),
        frontmatter: { passage: passage.reference, tags: ['bible'] }
      },
      false
    )
  }

  const toggleVerse = (i: number) => {
    const next = new Set(selected)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setSelected(next)
  }

  return (
    <div className="bible-view">
      <div className="bible-reader">
        <form
          className="passage-search"
          onSubmit={(e) => {
            e.preventDefault()
            void lookup(query)
          }}
        >
          <Search size={18} className="muted" />
          <input
            className="passage-input"
            placeholder="Look up a passage — e.g. Romans 8:1-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Open'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {passage ? (
          <article className="scripture">
            <h1>{passage.reference}</h1>
            <p>
              {passage.verses.map((v, i) => (
                <span
                  key={i}
                  className={clsx('verse', selected.has(i) && 'selected')}
                  onClick={() => toggleVerse(i)}
                  title="Click to select verses to quote"
                >
                  {v.number !== null && <sup>{v.number}</sup>}
                  {v.text}{' '}
                </span>
              ))}
            </p>
            <footer className="copyright">{passage.copyright}</footer>
          </article>
        ) : (
          !error && (
            <div className="study-list">
              <h2 className="section-title">Your studies</h2>
              {studies.length === 0 && <p className="muted">Look up a passage to start your first study.</p>}
              {studies.map((n) => (
                <button
                  key={n.path}
                  className="study-item"
                  onClick={() => {
                    setQuery(String(n.frontmatter.passage))
                    void lookup(String(n.frontmatter.passage))
                  }}
                >
                  <PageIcon note={n} size={16} />
                  <span>{n.title}</span>
                  <span className="muted">{String(n.frontmatter.passage)}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <div className="bible-notes">
        {passage && existing ? (
          <StudyNote
            key={existing.path}
            path={existing.path}
            passage={passage}
            selected={selected}
            clearSelection={() => setSelected(new Set())}
            onOpen={() => navigate({ kind: 'note', path: existing.path })}
          />
        ) : passage ? (
          <div className="empty-state">
            <NotebookPen size={40} strokeWidth={1.2} />
            <p>No study notes for {passage.reference} yet.</p>
            <button className="button primary" onClick={() => void startStudy()}>
              Start study note
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={40} strokeWidth={1.2} />
            <p>Open a passage to read it alongside your notes.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StudyNote(props: {
  path: string
  passage: BiblePassage
  selected: Set<number>
  clearSelection(): void
  onOpen(): void
}) {
  const [note, setNote] = useState<Note | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const noteSaved = useStore((s) => s.noteSaved)
  const { schedule } = useAutosave<string>(async (body) => {
    noteSaved(await api.notes.write(props.path, body))
  })

  useEffect(() => {
    void api.notes.read(props.path).then(setNote)
  }, [props.path])

  const onReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const quoteSelection = () => {
    const editor = editorRef.current
    if (!editor || props.selected.size === 0) return
    const indices = [...props.selected].sort((a, b) => a - b)
    const verses = indices.map((i) => props.passage.verses[i])
    const label = citeVerses(props.passage.reference, verses)
    const text = verses.map((v) => (v.number !== null ? `**${v.number}** ${v.text}` : v.text)).join(' ')
    editor
      .chain()
      .focus('end')
      .insertContent(`> ${text}\n>\n> — ${label} ${ESV_SHORT_COPYRIGHT}\n\n`, { contentType: 'markdown' })
      .run()
    props.clearSelection()
  }

  if (!note) return null
  return (
    <div className="study-note">
      <div className="note-toolbar">
        <button className="link-button" onClick={props.onOpen}>
          {note.title}
        </button>
        <div className="spacer" />
        <button className="button secondary" disabled={props.selected.size === 0} onClick={quoteSelection}>
          <Quote size={14} />
          Quote {props.selected.size || ''} verse{props.selected.size === 1 ? '' : 's'}
        </button>
      </div>
      <NoteEditor markdown={note.body} onChange={schedule} onReady={onReady} />
    </div>
  )
}
