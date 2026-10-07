import { useState } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { AlignLeft, CalendarDays, Check, Clock, FileText, Folder, MapPin, Pencil, Trash2, X } from 'lucide-react'
import { describeWhen, isSpanning, shortTime, textOn, type CalItem } from '@renderer/lib/calendar'
import type { Draft } from './TimeGrid'

type EventItem = Extract<CalItem, { kind: 'event' }>
type TaskItem = Extract<CalItem, { kind: 'task' }>

function Actions({ children, onClose }: { children?: React.ReactNode; onClose(): void }) {
  return (
    <div className="card-actions">
      {children}
      <button type="button" className="icon-button" onClick={onClose} title="Close">
        <X size={18} />
      </button>
    </div>
  )
}

/** Google's event details card. */
export function EventCard({
  item,
  onEdit,
  onDelete,
  onOpenNote,
  onClose
}: {
  item: EventItem
  onEdit(): void
  onDelete(): void
  onOpenNote(path: string): void
  onClose(): void
}) {
  const { event } = item
  return (
    <>
      <Actions onClose={onClose}>
        <button className="icon-button" onClick={onEdit} title="Edit event">
          <Pencil size={17} />
        </button>
        <button className="icon-button" onClick={onDelete} title="Delete event">
          <Trash2 size={17} />
        </button>
      </Actions>
      <div className="card-row">
        <span className="card-icon">
          <span className="swatch" style={{ background: item.color }} />
        </span>
        <div>
          <div className="card-title">{item.title}</div>
          <div className="card-sub">{describeWhen(item)}</div>
        </div>
      </div>
      {event.location && (
        <div className="card-row">
          <span className="card-icon">
            <MapPin size={18} />
          </span>
          <div>{event.location}</div>
        </div>
      )}
      {event.description && (
        <div className="card-row">
          <span className="card-icon">
            <AlignLeft size={18} />
          </span>
          <div className="card-desc">{event.description}</div>
        </div>
      )}
      {event.notePath && (
        <div className="card-row">
          <span className="card-icon">
            <FileText size={18} />
          </span>
          <button className="link-button" onClick={() => onOpenNote(event.notePath!)}>
            {event.notePath.replace(/\.md$/, '')}
          </button>
        </div>
      )}
      <div className="card-row">
        <span className="card-icon">
          <CalendarDays size={18} />
        </span>
        <div className="card-sub">{event.calendarId === 'local' ? 'Noteable' : event.calendarId}</div>
      </div>
    </>
  )
}

/** Details card for a scheduled task, with Google's "Mark completed". */
export function TaskCard({
  item,
  projectName,
  onToggle,
  onDelete,
  onOpenProject,
  onClose
}: {
  item: TaskItem
  projectName?: string
  onToggle(): void
  onDelete(): void
  onOpenProject(): void
  onClose(): void
}) {
  const { task } = item
  return (
    <>
      <Actions onClose={onClose}>
        <button className="icon-button" onClick={onDelete} title="Delete task">
          <Trash2 size={17} />
        </button>
      </Actions>
      <div className="card-row">
        <span className="card-icon">
          <span className="swatch round" style={{ borderColor: item.color }} />
        </span>
        <div>
          <div className="card-title">{item.title}</div>
          <div className="card-sub">
            {format(item.start, 'EEEE, MMMM d')}
            {task.due?.time && ` ⋅ ${shortTime(item.start)}`}
            {task.due?.recurrence && ` ⋅ ${task.due.recurrence}`}
          </div>
        </div>
      </div>
      {task.description && (
        <div className="card-row">
          <span className="card-icon">
            <AlignLeft size={18} />
          </span>
          <div className="card-desc">{task.description}</div>
        </div>
      )}
      <div className="card-row">
        <span className="card-icon">
          <Folder size={18} />
        </span>
        <button className="link-button" onClick={onOpenProject}>
          {projectName ?? 'Inbox'}
        </button>
      </div>
      <div className="card-footer">
        <button className="button primary" onClick={onToggle}>
          <Check size={14} /> Mark completed
        </button>
      </div>
    </>
  )
}

/** Google's quick-create card: title, Event/Task switch, Save or "More options". */
export function QuickCreate({
  draft,
  onTitle,
  onSave,
  onMore,
  onClose
}: {
  draft: Draft
  onTitle(title: string): void
  onSave(kind: 'event' | 'task'): void
  onMore(): void
  onClose(): void
}) {
  const [kind, setKind] = useState<'event' | 'task'>('event')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(kind)
      }}
    >
      <Actions onClose={onClose} />
      <div className="card-body">
        <input className="event-title" autoFocus placeholder="Add title" value={draft.title} onChange={(e) => onTitle(e.target.value)} />
        <div className="qc-tabs">
          {(['event', 'task'] as const).map((k) => (
            <button key={k} type="button" className={clsx(k === kind && 'active')} onClick={() => setKind(k)}>
              {k === 'event' ? 'Event' : 'Task'}
            </button>
          ))}
        </div>
      </div>
      <div className="card-row">
        <span className="card-icon">
          <Clock size={18} />
        </span>
        <button type="button" className="card-when" onClick={onMore} disabled={kind === 'task'}>
          {describeWhen(draft)}
        </button>
      </div>
      {kind === 'task' && (
        <div className="card-row">
          <span className="card-icon">
            <Folder size={18} />
          </span>
          <div className="card-sub">Inbox</div>
        </div>
      )}
      <div className="card-footer">
        {kind === 'event' && (
          <button type="button" className="button secondary" onClick={onMore}>
            More options
          </button>
        )}
        <button type="submit" className="button primary">
          Save
        </button>
      </div>
    </form>
  )
}

/** The "N more" card listing everything on one day. */
export function DayCard({
  day,
  items,
  onOpen,
  onClose
}: {
  day: Date
  items: CalItem[]
  onOpen(item: CalItem): void
  onClose(): void
}) {
  return (
    <>
      <Actions onClose={onClose} />
      <div className="day-card-head">
        <div className="dow">{format(day, 'EEE')}</div>
        <div className="dom">{format(day, 'd')}</div>
      </div>
      <div className="day-card-list">
        {items.map((item) => {
          const bar = isSpanning(item)
          return (
            <button
              key={item.id}
              className={clsx(bar ? 'cal-bar' : 'mg-chip', item.kind)}
              style={{ '--ev': item.color, color: bar && item.kind === 'event' ? textOn(item.color) : undefined } as React.CSSProperties}
              onClick={() => onOpen(item)}
            >
              {!bar && <span className="dot" />}
              {!item.allDay && <span className="bar-time">{shortTime(item.start)}</span>}
              <span className="bar-title">{item.title}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
