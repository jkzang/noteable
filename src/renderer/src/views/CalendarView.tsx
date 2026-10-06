import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addWeeks, endOfDay, format, isSameDay, isToday, startOfDay, startOfWeek } from 'date-fns'
import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarEvent, Task } from '@shared/types'
import { EventDialog } from '@renderer/components/EventDialog'
import { layoutDay } from '@renderer/lib/calendarLayout'
import { toISODate } from '@renderer/lib/dates'
import { PRIORITY_COLORS } from '@renderer/lib/tasks'
import { useStore } from '@renderer/store/useStore'

const HOUR_HEIGHT = 48
const TASK_MINUTES = 30

type Block =
  | { kind: 'event'; id: string; start: number; end: number; event: CalendarEvent }
  | { kind: 'task'; id: string; start: number; end: number; task: Task }

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

function newEvent(start: Date, minutes = 60): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: '',
    start: start.toISOString(),
    end: new Date(start.getTime() + minutes * 60000).toISOString(),
    allDay: false,
    calendarId: 'local',
    updatedAt: new Date().toISOString()
  }
}

export function CalendarView() {
  const events = useStore((s) => s.events)
  const tasks = useStore((s) => s.tasks)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const toggleTask = useStore((s) => s.toggleTask)
  const [anchor, setAnchor] = useState(() => new Date())
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [anchor, weekStartsOn])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: HOUR_HEIGHT * 6.5 })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        const iso = toISODate(day)
        const allDay: ({ kind: 'event'; event: CalendarEvent } | { kind: 'task'; task: Task })[] = []
        const timed: Block[] = []

        for (const event of events) {
          const s = new Date(event.start)
          const e = new Date(event.end)
          if (e <= dayStart || s > dayEnd) continue
          if (event.allDay) {
            allDay.push({ kind: 'event', event })
            continue
          }
          const start = s < dayStart ? 0 : minutesOf(s)
          const end = e > dayEnd ? 24 * 60 : Math.max(minutesOf(e), start + 15)
          timed.push({ kind: 'event', id: event.id, start, end, event })
        }
        for (const task of tasks) {
          if (task.completed || task.due?.date !== iso) continue
          if (!task.due.time) {
            allDay.push({ kind: 'task', task })
            continue
          }
          const [h, m] = task.due.time.split(':').map(Number)
          const start = h * 60 + m
          timed.push({ kind: 'task', id: task.id, start, end: start + TASK_MINUTES, task })
        }
        return { day, allDay, placed: layoutDay(timed) }
      }),
    [days, events, tasks]
  )

  const createAt = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const minutes = Math.floor(((e.clientY - rect.top) / HOUR_HEIGHT) * 2) * 30
    const start = startOfDay(day)
    start.setMinutes(minutes)
    setEditing(newEvent(start))
  }

  return (
    <div className="calendar-view">
      <header className="calendar-header">
        <h1>{format(days[0], 'MMMM yyyy')}</h1>
        <div className="spacer" />
        <button className="button secondary" onClick={() => setEditing(newEvent(new Date(new Date().setMinutes(0, 0, 0) + 3600000)))}>
          <Plus size={14} /> Event
        </button>
        <div className="segmented">
          <button className="icon-button" onClick={() => setAnchor(addWeeks(anchor, -1))} title="Previous week">
            <ChevronLeft size={18} />
          </button>
          <button className="button secondary" onClick={() => setAnchor(new Date())}>
            Today
          </button>
          <button className="icon-button" onClick={() => setAnchor(addWeeks(anchor, 1))} title="Next week">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="calendar-scroll" ref={scrollRef}>
        <div className="calendar-days">
          <div className="calendar-gutter" />
          {perDay.map(({ day, allDay }) => (
            <div key={day.toISOString()} className={clsx('calendar-day-head', isToday(day) && 'today')}>
              <div className="dow">{format(day, 'EEE')}</div>
              <div className="dom">{format(day, 'd')}</div>
              <div className="all-day">
                {allDay.map((item) =>
                  item.kind === 'event' ? (
                    <button
                      key={item.event.id}
                      className="all-day-item"
                      style={{ background: item.event.color ?? 'var(--accent)' }}
                      onClick={() => setEditing(item.event)}
                    >
                      {item.event.title}
                    </button>
                  ) : (
                    <div key={item.task.id} className="all-day-item task">
                      <button
                        className="mini-check"
                        style={{ borderColor: PRIORITY_COLORS[item.task.priority] }}
                        onClick={() => void toggleTask(item.task.id)}
                        title="Complete"
                      >
                        <Check size={9} strokeWidth={3} />
                      </button>
                      {item.task.content}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="calendar-grid" style={{ height: HOUR_HEIGHT * 24 }}>
          <div className="calendar-gutter">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="hour-label" style={{ top: h * HOUR_HEIGHT }}>
                {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'h a')}
              </div>
            ))}
          </div>
          {perDay.map(({ day, placed }) => (
            <div
              key={day.toISOString()}
              className="calendar-column"
              onClick={(e) => e.target === e.currentTarget && createAt(day, e)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="hour-line" style={{ top: h * HOUR_HEIGHT }} />
              ))}
              {placed.map(({ item, column, columns }) => {
                const style: React.CSSProperties = {
                  top: (item.start / 60) * HOUR_HEIGHT,
                  height: Math.max(((item.end - item.start) / 60) * HOUR_HEIGHT - 2, 18),
                  left: `calc(${(column / columns) * 100}% + 2px)`,
                  width: `calc(${100 / columns}% - 4px)`
                }
                if (item.kind === 'event') {
                  const ev = item.event
                  return (
                    <button
                      key={item.id}
                      className="calendar-event"
                      style={{ ...style, background: ev.color ?? 'var(--accent)' }}
                      onClick={() => setEditing(ev)}
                    >
                      <span className="event-title-text">{ev.title}</span>
                      <span className="event-time">
                        {format(new Date(ev.start), 'h:mm')} – {format(new Date(ev.end), 'h:mm a')}
                      </span>
                    </button>
                  )
                }
                return (
                  <div key={item.id} className="calendar-task" style={style}>
                    <button
                      className="mini-check"
                      style={{ borderColor: PRIORITY_COLORS[item.task.priority] }}
                      onClick={() => void toggleTask(item.task.id)}
                      title="Complete"
                    >
                      <Check size={9} strokeWidth={3} />
                    </button>
                    {item.task.content}
                  </div>
                )
              })}
              {isSameDay(day, now) && (
                <div className="now-line" style={{ top: (minutesOf(now) / 60) * HOUR_HEIGHT }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <EventDialog event={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
