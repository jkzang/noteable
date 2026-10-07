import { useEffect, useMemo, useRef, useState } from 'react'
import { addHours, format, isToday, startOfHour } from 'date-fns'
import clsx from 'clsx'
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react'
import type { CalendarEvent } from '@shared/types'
import { EventDialog } from '@renderer/components/EventDialog'
import {
  buildItems,
  DEFAULT_EVENT_COLOR,
  isSpanning,
  MODES,
  stepAnchor,
  touchesDay,
  viewTitle,
  visibleDays,
  type CalendarMode,
  type CalItem
} from '@renderer/lib/calendar'
import { toISODate } from '@renderer/lib/dates'
import { useStore } from '@renderer/store/useStore'
import { DayCard, EventCard, QuickCreate, TaskCard } from './calendar/Cards'
import { MiniMonth } from './calendar/MiniMonth'
import { MonthGrid } from './calendar/MonthGrid'
import { Popover } from './calendar/Popover'
import { ScheduleList } from './calendar/ScheduleList'
import { TimeGrid, type Draft } from './calendar/TimeGrid'
import type { Range } from './calendar/useCalendarDrag'

type PopoverState =
  | { kind: 'item'; id: string; el: Element }
  | { kind: 'create'; draft: Draft }
  | { kind: 'day'; day: Date; el: Element }
  | null

const SHORTCUTS: Record<string, CalendarMode> = { d: 'day', 1: 'day', w: 'week', 2: 'week', m: 'month', 3: 'month', x: '4day', 4: '4day', a: 'schedule', 5: 'schedule' }

/** A per-viewer UI preference kept in localStorage (which may be unavailable). */
function usePref<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  const set = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Not persisted; fine.
    }
  }
  return [value, set]
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)))
}

function eventFrom(range: Range, title = ''): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    allDay: range.allDay,
    color: DEFAULT_EVENT_COLOR,
    calendarId: 'local',
    updatedAt: new Date().toISOString()
  }
}

export function CalendarView() {
  const events = useStore((s) => s.events)
  const tasks = useStore((s) => s.tasks)
  const projects = useStore((s) => s.projects)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const modalOpen = useStore((s) => s.quickAddOpen || s.settingsOpen || s.passagePicker !== null)
  const { toggleTask, deleteTask, updateTask, addTask, saveEvent, deleteEvent, navigate, notify } = useStore.getState()

  const [mode, setMode] = usePref<CalendarMode>('noteable.calendar.mode', 'week')
  const [panelOpen, setPanelOpen] = usePref('noteable.calendar.panel', true)
  const [show, setShow] = usePref('noteable.calendar.show', { events: true, tasks: true })
  const [anchor, setAnchor] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [popover, setPopover] = useState<PopoverState>(null)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const days = useMemo(() => visibleDays(mode, anchor, weekStartsOn), [mode, anchor, weekStartsOn])
  const items = useMemo(() => {
    const colors = new Map(projects.map((p) => [p.id, p.color]))
    return buildItems(show.events ? events : [], show.tasks ? tasks : [], (id) => (id ? colors.get(id) : undefined))
  }, [events, tasks, projects, show])

  const go = (next: Date, nextMode = mode) => {
    setPopover(null)
    setAnchor(next)
    if (nextMode !== mode) setMode(nextMode)
  }

  const createNow = () => {
    const start = isToday(anchor) ? addHours(startOfHour(new Date()), 1) : new Date(new Date(anchor).setHours(9, 0, 0, 0))
    setPopover(null)
    setEditing(eventFrom({ start, end: addHours(start, 1), allDay: false }))
  }

  // Google Calendar's keyboard shortcuts.
  const keys = useRef({ mode, anchor, go, createNow })
  keys.current = { mode, anchor, go, createNow }
  const blocked = editing !== null || modalOpen
  useEffect(() => {
    if (blocked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const { mode, anchor, go, createNow } = keys.current
      const key = e.key.toLowerCase()
      if (SHORTCUTS[key]) go(anchor, SHORTCUTS[key])
      else if (key === 't') go(new Date())
      else if (key === 'j' || key === 'n') go(stepAnchor(mode, anchor, 1))
      else if (key === 'k' || key === 'p') go(stepAnchor(mode, anchor, -1))
      else if (key === 'c') createNow()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocked])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // ---- item actions

  const onChange = (item: CalItem, start: Date, end: Date) => {
    if (item.kind === 'event') {
      const before = item.event
      void saveEvent({ ...before, start: start.toISOString(), end: end.toISOString() })
      notify('Event saved', () => void saveEvent(before))
    } else if (item.task.due) {
      const before = item.task.due
      void updateTask(item.id, { due: { ...before, date: toISODate(start), time: before.time ? format(start, 'HH:mm') : undefined } })
      notify('Task rescheduled', () => void updateTask(item.id, { due: before }))
    }
  }

  const removeEvent = (event: CalendarEvent) => {
    setPopover(null)
    void deleteEvent(event.id)
    notify('Event deleted', () => void saveEvent(event))
  }

  const saveDraft = async (draft: Draft, kind: 'event' | 'task') => {
    setPopover(null)
    if (kind === 'event') {
      await saveEvent(eventFrom(draft, draft.title.trim() || '(No title)'))
      return
    }
    await addTask({
      content: draft.title.trim() || '(No title)',
      due: { date: toISODate(draft.start), time: draft.allDay ? undefined : format(draft.start, 'HH:mm') }
    })
  }

  const draft = popover?.kind === 'create' ? popover.draft : null
  const selectedId = popover?.kind === 'item' ? popover.id : null
  const openItem = (item: CalItem, el: Element) => setPopover({ kind: 'item', id: item.id, el })
  const gridProps = {
    days,
    items,
    now,
    draft,
    selectedId,
    onPickDay: (day: Date) => go(day, 'day'),
    onCreate: (range: Range) => setPopover({ kind: 'create', draft: { ...range, title: '' } }),
    onChange,
    onOpen: openItem,
    onToggleTask: (id: string) => void toggleTask(id)
  }

  const renderPopover = () => {
    if (!popover) return null
    const close = () => setPopover(null)
    if (popover.kind === 'create') {
      return (
        <Popover anchor={() => document.querySelector('.calendar-draft')} onClose={close} className="quick-create">
          <QuickCreate
            draft={popover.draft}
            onTitle={(title) => setPopover({ ...popover, draft: { ...popover.draft, title } })}
            onSave={(kind) => void saveDraft(popover.draft, kind)}
            onMore={() => {
              setPopover(null)
              setEditing(eventFrom(popover.draft, popover.draft.title))
            }}
            onClose={close}
          />
        </Popover>
      )
    }
    if (popover.kind === 'day') {
      const dayItems = items
        .filter((i) => touchesDay(i, popover.day))
        .sort((a, b) => Number(isSpanning(b)) - Number(isSpanning(a)) || a.start.getTime() - b.start.getTime())
      return (
        <Popover anchor={() => popover.el} onClose={close} className="day-card">
          <DayCard day={popover.day} items={dayItems} onOpen={(item) => openItem(item, popover.el)} onClose={close} />
        </Popover>
      )
    }
    const item = items.find((i) => i.id === popover.id)
    if (!item) return null
    return (
      <Popover anchor={() => (popover.el.isConnected ? popover.el : null)} onClose={close}>
        {item.kind === 'event' ? (
          <EventCard
            item={item}
            onEdit={() => {
              setPopover(null)
              setEditing(item.event)
            }}
            onDelete={() => removeEvent(item.event)}
            onOpenNote={(path) => navigate({ kind: 'note', path })}
            onClose={close}
          />
        ) : (
          <TaskCard
            item={item}
            projectName={projects.find((p) => p.id === item.task.projectId)?.name}
            onToggle={() => {
              close()
              void toggleTask(item.id)
            }}
            onDelete={() => {
              close()
              void deleteTask(item.id)
            }}
            onOpenProject={() => navigate(item.task.projectId ? { kind: 'project', id: item.task.projectId } : { kind: 'inbox' })}
            onClose={close}
          />
        )}
      </Popover>
    )
  }

  const modeLabel = MODES.find((m) => m.mode === mode)?.label

  return (
    <div className="cal">
      <header className="cal-header">
        <button className="icon-button" onClick={() => setPanelOpen(!panelOpen)} title="Main menu">
          <Menu size={20} />
        </button>
        <button className="button outline" onClick={() => go(new Date())} title={format(now, 'EEEE, MMMM d')}>
          Today
        </button>
        <div className="cal-nav">
          <button className="icon-button" onClick={() => go(stepAnchor(mode, anchor, -1))} title="Previous (K)">
            <ChevronLeft size={20} />
          </button>
          <button className="icon-button" onClick={() => go(stepAnchor(mode, anchor, 1))} title="Next (J)">
            <ChevronRight size={20} />
          </button>
        </div>
        <h1>{viewTitle(mode, anchor, days)}</h1>
        <div className="spacer" />
        <div className="view-menu" ref={menuRef}>
          <button className="button outline" onClick={() => setMenuOpen(!menuOpen)} aria-haspopup="menu" aria-expanded={menuOpen}>
            {modeLabel} <ChevronDown size={16} />
          </button>
          {menuOpen && (
            <div className="view-menu-list" role="menu">
              {MODES.map((m) => (
                <button
                  key={m.mode}
                  role="menuitem"
                  className={clsx(m.mode === mode && 'active')}
                  onClick={() => {
                    setMenuOpen(false)
                    go(anchor, m.mode)
                  }}
                >
                  <span>{m.label}</span>
                  <kbd>{m.key}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="cal-main">
        {panelOpen && (
          <aside className="cal-panel">
            <button className="cal-create" onClick={createNow} title="Create (C)">
              <Plus size={22} /> Create
            </button>
            <MiniMonth selected={anchor} range={mode === 'schedule' ? [] : days} weekStartsOn={weekStartsOn} onPick={(d) => go(d)} />
            <div className="cal-list">
              <div className="cal-list-head">My calendars</div>
              <label className="cal-list-item">
                <input type="checkbox" checked={show.events} onChange={(e) => setShow({ ...show, events: e.target.checked })} style={{ accentColor: DEFAULT_EVENT_COLOR }} />
                Events
              </label>
              <label className="cal-list-item">
                <input type="checkbox" checked={show.tasks} onChange={(e) => setShow({ ...show, tasks: e.target.checked })} style={{ accentColor: '#4285f4' }} />
                Tasks
              </label>
            </div>
          </aside>
        )}
        <div className="cal-body">
          {(mode === 'day' || mode === '4day' || mode === 'week') && <TimeGrid {...gridProps} />}
          {mode === 'month' && (
            <MonthGrid {...gridProps} anchor={anchor} onMore={(day, el) => setPopover({ kind: 'day', day, el })} />
          )}
          {mode === 'schedule' && (
            <ScheduleList
              days={days}
              items={items}
              now={now}
              selectedId={selectedId}
              onPickDay={gridProps.onPickDay}
              onOpen={openItem}
              onToggleTask={gridProps.onToggleTask}
            />
          )}
        </div>
      </div>

      {renderPopover()}
      <EventDialog event={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

