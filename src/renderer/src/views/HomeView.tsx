import { useMemo } from 'react'
import { Clock, FileText, Plus } from 'lucide-react'
import { PageIcon } from '@renderer/components/PageIcon'
import { pageEmoji } from '@renderer/lib/pages'
import { timeAgo } from '@renderer/lib/timeAgo'
import { useStore } from '@renderer/store/useStore'

function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const RECENT_CARDS = 7

/** Notion-style home: a greeting, recently edited cards and every page. */
export function HomeView() {
  const notes = useStore((s) => s.notes)
  const navigate = useStore((s) => s.navigate)
  const createNote = useStore((s) => s.createNote)

  const recent = useMemo(() => [...notes].sort((a, b) => b.mtime - a.mtime), [notes])

  return (
    <div className="page">
      <div className="page-body home">
        <h1 className="home-greeting">{greeting()}</h1>

        <h2 className="home-section">
          <Clock size={14} />
          Recently edited
        </h2>
        <div className="card-row">
          {recent.slice(0, RECENT_CARDS).map((n) => (
            <button key={n.path} className="page-card" onClick={() => navigate({ kind: 'note', path: n.path })}>
              <div className="page-card-cover" />
              <div className="page-card-icon">
                {pageEmoji(n) ? <PageIcon note={n} size={26} /> : <FileText size={26} strokeWidth={1.5} />}
              </div>
              <div className="page-card-title">{n.title || 'Untitled'}</div>
              <div className="page-card-time">{timeAgo(n.mtime)}</div>
            </button>
          ))}
          <button className="page-card new" onClick={() => void createNote({ title: 'Untitled' })}>
            <Plus size={22} />
            <span>New page</span>
          </button>
        </div>

        <h2 className="home-section">
          <FileText size={14} />
          All pages
        </h2>
        <div className="page-list">
          {recent.map((n) => (
            <button key={n.path} className="page-row" onClick={() => navigate({ kind: 'note', path: n.path })}>
              <span className="page-row-icon">
                <PageIcon note={n} size={17} />
              </span>
              <span className="page-row-title">{n.title || 'Untitled'}</span>
              {n.folder && <span className="page-row-folder">{n.folder}</span>}
              <span className="page-row-time">{timeAgo(n.mtime)}</span>
            </button>
          ))}
          {recent.length === 0 && <p className="muted">No pages yet — create one to get started.</p>}
        </div>
      </div>
    </div>
  )
}
