import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FileText,
  Hash,
  Inbox,
  Plus,
  Settings as SettingsIcon,
  Sun
} from 'lucide-react'
import type { NoteMeta } from '@shared/types'
import { inboxTasks, PROJECT_COLORS, projectTasks, todayTasks } from '@renderer/lib/tasks'
import { useStore, type View } from '@renderer/store/useStore'

function sameView(a: View, b: View): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'project' && b.kind === 'project') return a.id === b.id
  if (a.kind === 'note' && b.kind === 'note') return a.path === b.path
  return true
}

function NavItem(props: { view: View; icon: React.ReactNode; label: string; count?: number; color?: string }) {
  const current = useStore((s) => s.view)
  const navigate = useStore((s) => s.navigate)
  return (
    <button
      className={clsx('nav-item', sameView(current, props.view) && 'active')}
      onClick={() => navigate(props.view)}
      title={props.label}
    >
      <span className="nav-icon" style={props.color ? { color: props.color } : undefined}>
        {props.icon}
      </span>
      <span className="nav-label">{props.label}</span>
      {props.count ? <span className="nav-count">{props.count}</span> : null}
    </button>
  )
}

function Section(props: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="nav-section">
      <div className="nav-section-header">
        <button className="nav-section-title" onClick={() => setOpen(!open)}>
          {props.title}
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {props.onAdd && (
          <button className="icon-button small" onClick={props.onAdd} title={`Add ${props.title.toLowerCase()}`}>
            <Plus size={16} />
          </button>
        )}
      </div>
      {open && props.children}
    </div>
  )
}

function groupByFolder(notes: NoteMeta[]): [string, NoteMeta[]][] {
  const groups = new Map<string, NoteMeta[]>()
  for (const n of [...notes].sort((a, b) => a.title.localeCompare(b.title))) {
    groups.set(n.folder, [...(groups.get(n.folder) ?? []), n])
  }
  return [...groups.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
}

export function Sidebar() {
  const vault = useStore((s) => s.vault)
  const tasks = useStore((s) => s.tasks)
  const projects = useStore((s) => s.projects)
  const notes = useStore((s) => s.notes)
  const setQuickAdd = useStore((s) => s.setQuickAdd)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const addProject = useStore((s) => s.addProject)
  const createNote = useStore((s) => s.createNote)
  const navigate = useStore((s) => s.navigate)
  const [newProject, setNewProject] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const today = useMemo(() => todayTasks(tasks), [tasks])
  const folders = useMemo(() => groupByFolder(notes), [notes])

  const submitProject = async () => {
    const name = newProject?.trim()
    setNewProject(null)
    if (!name) return
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
    const p = await addProject(name, color)
    navigate({ kind: 'project', id: p.id })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="vault-name" title={vault?.path}>
          <span className="vault-avatar">{vault?.name.slice(0, 1).toUpperCase()}</span>
          {vault?.name}
        </div>
        <button className="icon-button" onClick={() => setSettingsOpen(true)} title="Settings">
          <SettingsIcon size={18} />
        </button>
      </div>

      <button className="nav-item add-task" onClick={() => setQuickAdd(true)} title="Add task (Q)">
        <span className="add-task-icon">
          <Plus size={14} strokeWidth={3} />
        </span>
        <span className="nav-label">Add task</span>
      </button>

      <nav className="nav">
        <NavItem view={{ kind: 'inbox' }} icon={<Inbox size={18} />} label="Inbox" count={inboxTasks(tasks).length} color="var(--blue)" />
        <NavItem
          view={{ kind: 'today' }}
          icon={<Sun size={18} />}
          label="Today"
          count={today.today.length + today.overdue.length}
          color="var(--green)"
        />
        <NavItem view={{ kind: 'upcoming' }} icon={<CalendarRange size={18} />} label="Upcoming" color="var(--purple)" />
        <NavItem view={{ kind: 'calendar' }} icon={<CalendarDays size={18} />} label="Calendar" color="var(--orange)" />
        <NavItem view={{ kind: 'bible' }} icon={<BookOpen size={18} />} label="Bible Study" color="var(--accent)" />

        <Section title="My Projects" onAdd={() => setNewProject('')}>
          {projects
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((p) => (
              <NavItem
                key={p.id}
                view={{ kind: 'project', id: p.id }}
                icon={<Hash size={16} />}
                label={p.name}
                color={p.color}
                count={projectTasks(tasks, p.id).length}
              />
            ))}
          {newProject !== null && (
            <input
              className="nav-input"
              autoFocus
              placeholder="Project name"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              onBlur={submitProject}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitProject()
                if (e.key === 'Escape') setNewProject(null)
              }}
            />
          )}
        </Section>

        <Section title="Notes" onAdd={() => void createNote({ title: 'Untitled' })}>
          {folders.map(([folder, list]) => (
            <div key={folder || '/'}>
              {folder && (
                <button
                  className="nav-folder"
                  onClick={() => setCollapsed({ ...collapsed, [folder]: !collapsed[folder] })}
                >
                  {collapsed[folder] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  {folder}
                </button>
              )}
              {!collapsed[folder] && (
                <div className={folder ? 'nav-indent' : undefined}>
                  {list.map((n) => (
                    <NavItem
                      key={n.path}
                      view={{ kind: 'note', path: n.path }}
                      icon={n.frontmatter.passage ? <BookOpen size={16} /> : <FileText size={16} />}
                      label={n.title}
                      color="var(--text-muted)"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>
      </nav>
    </aside>
  )
}
