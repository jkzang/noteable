import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { CornerDownLeft, Plus, Search } from 'lucide-react'
import { timeAgo } from '@renderer/lib/timeAgo'
import { useStore } from '@renderer/store/useStore'
import { Modal } from './Modal'
import { PageIcon } from './PageIcon'

const MAX_RESULTS = 50

/** Notion-style "Search" palette: jump to a page by title, or create one. */
export function SearchModal() {
  const open = useStore((s) => s.searchOpen)
  const setOpen = useStore((s) => s.setSearchOpen)
  const notes = useStore((s) => s.notes)
  const navigate = useStore((s) => s.navigate)
  const createNote = useStore((s) => s.createNote)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    const sorted = [...notes].sort((a, b) => b.mtime - a.mtime)
    if (!q) return sorted.slice(0, MAX_RESULTS)
    const matches = sorted.filter((n) => `${n.folder} ${n.title}`.toLowerCase().includes(q))
    // Titles that start with the query rank first, like Notion's quick find.
    return matches
      .sort((a, b) => Number(b.title.toLowerCase().startsWith(q)) - Number(a.title.toLowerCase().startsWith(q)))
      .slice(0, MAX_RESULTS)
  }, [notes, q])

  // The last row creates a page named after the query.
  const count = results.length + (q ? 1 : 0)

  useEffect(() => setSelected(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const close = () => setOpen(false)
  const choose = (i: number) => {
    close()
    if (i < results.length) navigate({ kind: 'note', path: results[i].path })
    else void createNote({ title: query.trim() })
  }

  return (
    <Modal open={open} onClose={close} top className="search-modal">
      <div className="search-input-row">
        <Search size={18} className="muted" />
        <input
          autoFocus
          className="search-input"
          placeholder="Search pages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && count) {
              e.preventDefault()
              setSelected((s) => (s + 1) % count)
            } else if (e.key === 'ArrowUp' && count) {
              e.preventDefault()
              setSelected((s) => (s - 1 + count) % count)
            } else if (e.key === 'Enter' && count) {
              e.preventDefault()
              choose(selected)
            }
          }}
        />
      </div>
      <div className="search-results" ref={listRef}>
        {!q && results.length > 0 && <div className="menu-heading">Recent</div>}
        {results.map((n, i) => (
          <button
            key={n.path}
            className={clsx('search-result', i === selected && 'selected')}
            onMouseEnter={() => setSelected(i)}
            onClick={() => choose(i)}
          >
            <span className="search-result-icon">
              <PageIcon note={n} size={18} />
            </span>
            <span className="search-result-title">{n.title || 'Untitled'}</span>
            {n.folder && <span className="search-result-path">{n.folder}</span>}
            <span className="search-result-time">{timeAgo(n.mtime)}</span>
          </button>
        ))}
        {q && (
          <button
            className={clsx('search-result', selected === results.length && 'selected')}
            onMouseEnter={() => setSelected(results.length)}
            onClick={() => choose(results.length)}
          >
            <span className="search-result-icon">
              <Plus size={18} />
            </span>
            <span className="search-result-title">
              New page “{query.trim()}”
            </span>
          </button>
        )}
        {!q && results.length === 0 && <div className="search-empty">No pages yet.</div>}
      </div>
      <div className="search-footer">
        <span>
          ↑↓ to navigate · <CornerDownLeft size={11} /> to open · esc to close
        </span>
      </div>
    </Modal>
  )
}
