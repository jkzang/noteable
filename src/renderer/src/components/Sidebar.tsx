import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  FolderOpen,
  Home,
  Plus,
  Search,
  Settings as SettingsIcon,
  SquarePen
} from 'lucide-react'
import type { NoteMeta } from '@shared/types'
import { MOD_KEY } from '@renderer/lib/keys'
import { buildTree, type FolderNode } from '@renderer/lib/pages'
import { useStore, type View } from '@renderer/store/useStore'
import { PageIcon } from './PageIcon'

function isActive(current: View, view: View): boolean {
  if (current.kind !== view.kind) return false
  if (current.kind === 'note' && view.kind === 'note') return current.path === view.path
  return true
}

function NavItem(props: { view: View; icon: React.ReactNode; label: string }) {
  const current = useStore((s) => s.view)
  const navigate = useStore((s) => s.navigate)
  return (
    <button className={clsx('nav-item', isActive(current, props.view) && 'active')} onClick={() => navigate(props.view)}>
      <span className="nav-icon">{props.icon}</span>
      <span className="nav-label">{props.label}</span>
    </button>
  )
}

function ActionItem(props: { icon: React.ReactNode; label: string; hint?: string; onClick(): void }) {
  return (
    <button className="nav-item" onClick={props.onClick}>
      <span className="nav-icon">{props.icon}</span>
      <span className="nav-label">{props.label}</span>
      {props.hint && <span className="nav-hint">{props.hint}</span>}
    </button>
  )
}

function PageItem({ note, depth }: { note: NoteMeta; depth: number }) {
  const current = useStore((s) => s.view)
  const navigate = useStore((s) => s.navigate)
  const view: View = { kind: 'note', path: note.path }
  return (
    <button
      className={clsx('nav-item', 'page-item', isActive(current, view) && 'active')}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => navigate(view)}
      title={note.title}
    >
      <span className="nav-icon">
        <PageIcon note={note} size={16} />
      </span>
      <span className="nav-label">{note.title || 'Untitled'}</span>
    </button>
  )
}

function FolderItem(props: {
  node: FolderNode
  depth: number
  collapsed: Record<string, boolean>
  toggle(path: string): void
}) {
  const { node, depth, collapsed, toggle } = props
  const createNote = useStore((s) => s.createNote)
  const open = !collapsed[node.path]
  return (
    <>
      <div className="nav-item folder-item" style={{ paddingLeft: 8 + depth * 14 }}>
        <button className="folder-toggle" onClick={() => toggle(node.path)} title={open ? 'Collapse' : 'Expand'}>
          <span className="nav-icon">
            <span className="folder-glyph">{open ? <FolderOpen size={16} strokeWidth={1.75} /> : <Folder size={16} strokeWidth={1.75} />}</span>
            <span className="folder-chevron">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          </span>
          <span className="nav-label">{node.name}</span>
        </button>
        <button
          className="icon-button tiny hover-only"
          onClick={() => void createNote({ title: 'Untitled', folder: node.path })}
          title={`New page in ${node.name}`}
        >
          <Plus size={14} />
        </button>
      </div>
      {open && <Tree node={node} depth={depth + 1} collapsed={collapsed} toggle={toggle} />}
    </>
  )
}

function Tree(props: { node: FolderNode; depth: number; collapsed: Record<string, boolean>; toggle(path: string): void }) {
  const { node, depth } = props
  return (
    <>
      {node.folders.map((f) => (
        <FolderItem key={f.path} {...props} node={f} />
      ))}
      {node.notes.map((n) => (
        <PageItem key={n.path} note={n} depth={depth} />
      ))}
    </>
  )
}

export function Sidebar() {
  const vault = useStore((s) => s.vault)
  const notes = useStore((s) => s.notes)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const setSearchOpen = useStore((s) => s.setSearchOpen)
  const createNote = useStore((s) => s.createNote)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [pagesOpen, setPagesOpen] = useState(true)

  const tree = useMemo(() => buildTree(notes), [notes])
  const toggle = (path: string) => setCollapsed((c) => ({ ...c, [path]: !c[path] }))
  const newPage = () => void createNote({ title: 'Untitled' })

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="workspace" onClick={() => setSettingsOpen(true)} title={vault?.path}>
          <span className="workspace-avatar">{vault?.name.slice(0, 1).toUpperCase()}</span>
          <span className="workspace-name">{vault?.name}</span>
          <ChevronsUpDown size={14} className="workspace-caret" />
        </button>
        <button className="icon-button small" onClick={newPage} title="New page">
          <SquarePen size={17} />
        </button>
      </div>

      <nav className="nav">
        <ActionItem icon={<Search size={17} />} label="Search" hint={`${MOD_KEY}K`} onClick={() => setSearchOpen(true)} />
        <NavItem view={{ kind: 'home' }} icon={<Home size={17} />} label="Home" />
        <NavItem view={{ kind: 'bible' }} icon={<BookOpen size={17} />} label="Bible Study" />
        <ActionItem icon={<SettingsIcon size={17} />} label="Settings" onClick={() => setSettingsOpen(true)} />
      </nav>

      <div className="nav-section">
        <div className="nav-section-header">
          <button className="nav-section-title" onClick={() => setPagesOpen(!pagesOpen)}>
            Pages
          </button>
          <button className="icon-button tiny hover-only" onClick={newPage} title="Add a page">
            <Plus size={14} />
          </button>
        </div>
        {pagesOpen && (
          <div className="nav">
            <Tree node={tree} depth={0} collapsed={collapsed} toggle={toggle} />
            <ActionItem icon={<Plus size={16} />} label="New page" onClick={newPage} />
          </div>
        )}
      </div>
    </aside>
  )
}
