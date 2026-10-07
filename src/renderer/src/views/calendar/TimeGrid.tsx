import { useEffect, useRef, useState } from 'react'
import { addDays, format, isSameDay, isToday } from 'date-fns'
import clsx from 'clsx'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  gmtLabel,
  isSpanning,
  layoutSpans,
  shortTime,
  textOn,
  timedSegments,
  timeRange,
  type CalItem,
  type DragZone,
  type GridPos
} from '@renderer/lib/calendar'
import { layoutDay } from '@renderer/lib/calendarLayout'
import { useCalendarDrag, type Range } from './useCalendarDrag'

export const HOUR_HEIGHT = 48
const COLLAPSED_LANES = 2

export interface Draft extends Range {
  title: string
}

interface Props {
  days: Date[]
  items: CalItem[]
  now: Date
  /** The not-yet-saved event shown while the quick-create card is open. */
  draft: Draft | null
  selectedId: string | null
  onPickDay(day: Date): void
  onCreate(range: Range): void
  onChange(item: CalItem, start: Date, end: Date): void
  onOpen(item: CalItem, el: Element): void
  onToggleTask(id: string): void
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

/** Day, 4-day and week views: an all-day row above a scrolling 24-hour grid. */
export function TimeGrid({ days, items, now, draft, selectedId, onPickDay, onCreate, onChange, onOpen, onToggleTask }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const colsRef = useRef<HTMLDivElement>(null)
  const allDayRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: HOUR_HEIGHT * Math.max(new Date().getHours() - 2, 0) })
  }, [])

  const locate = (zone: DragZone, x: number, y: number): GridPos | null => {
    const el = zone === 'time' ? colsRef.current : allDayRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const col = clamp(Math.floor(((x - r.left) / r.width) * days.length), 0, days.length - 1)
    if (zone === 'day') return { col, minutes: 0 }
    return { col, minutes: clamp(((y - r.top) / HOUR_HEIGHT) * 60, 0, 24 * 60 - 1) }
  }

  const { drag, begin, preview, creating, wasDragged } = useCalendarDrag({ days, locate, onCreate, onChange })
  const shown = preview(items)
  const ghost: Draft | null = creating ? { ...creating, title: '' } : draft
  const draggingId = drag && drag.type !== 'create' && drag.moved ? drag.item.id : null

  const open = (item: CalItem, e: React.MouseEvent | React.KeyboardEvent) => {
    if (!wasDragged()) onOpen(item, e.currentTarget)
  }
  const keyOpen = (item: CalItem) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open(item, e)
    }
  }
  const check = (id: string) => (
    <button
      className="mini-check"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onToggleTask(id)
      }}
      title="Mark complete"
    >
      <Check size={9} strokeWidth={3} />
    </button>
  )

  // ---- all-day row
  type Bar = CalItem | (Draft & { kind: 'ghost'; id: 'ghost'; color: string })
  const barItems: Bar[] = shown.filter(isSpanning)
  if (ghost && isSpanning(ghost)) barItems.push({ ...ghost, kind: 'ghost', id: 'ghost', color: 'var(--blue)' })
  const bars = layoutSpans(barItems, days)
  const lanes = bars.reduce((n, b) => Math.max(n, b.lane + 1), 0)
  const collapsible = lanes > COLLAPSED_LANES + 1
  const visibleLanes = collapsible && !expanded ? COLLAPSED_LANES : lanes
  const hiddenPerDay = days.map((_, col) =>
    bars.filter((b) => b.lane >= visibleLanes && b.startCol <= col && col <= b.endCol).length
  )

  return (
    <div className="tg" style={{ '--cols': days.length } as React.CSSProperties}>
      <div className="tg-scroll" ref={scrollRef}>
        <div className="tg-head">
          <div className="tg-row">
            <div className="tg-gutter" />
            <div className="tg-day-heads">
              {days.map((day) => (
                <div key={day.toISOString()} className={clsx('tg-day-head', isToday(day) && 'today', day < now && !isToday(day) && 'past')}>
                  <span className="dow">{format(day, 'EEE')}</span>
                  <button className="dom" onClick={() => onPickDay(day)} title={format(day, 'EEEE, MMMM d')}>
                    {format(day, 'd')}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="tg-row">
            <div className="tg-gutter tz">
              <span>{gmtLabel(now)}</span>
              {collapsible && (
                <button className="icon-button small" onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse all-day events' : 'Expand all-day events'}>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>
            <div
              className="tg-allday"
              ref={allDayRef}
              style={{ gridTemplateRows: `repeat(${visibleLanes + (hiddenPerDay.some(Boolean) ? 1 : 0)}, 22px)` }}
              onPointerDown={(e) => e.target === e.currentTarget && begin('create', 'day', e)}
            >
              {bars
                .filter((b) => b.lane < visibleLanes)
                .map(({ item, startCol, endCol, lane, clippedStart, clippedEnd }) => {
                  const style = { gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: lane + 1 }
                  if (item.kind === 'ghost') {
                    return (
                      <div key="ghost" className="cal-bar ghost calendar-draft" style={style}>
                        {item.title || '(No title)'}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className={clsx(
                        'cal-bar',
                        item.kind,
                        clippedStart && 'clip-start',
                        clippedEnd && 'clip-end',
                        item.end < now && 'past',
                        item.id === selectedId && 'selected',
                        item.id === draggingId && 'dragging'
                      )}
                      style={{ ...style, '--ev': item.color, color: item.kind === 'event' ? textOn(item.color) : undefined } as React.CSSProperties}
                      onPointerDown={(e) => begin('move', 'day', e, item)}
                      onClick={(e) => open(item, e)}
                      onKeyDown={keyOpen(item)}
                    >
                      {item.kind === 'task' && check(item.id)}
                      {!item.allDay && <span className="bar-time">{shortTime(item.start)}</span>}
                      <span className="bar-title">{item.title}</span>
                    </div>
                  )
                })}
              {hiddenPerDay.map((n, col) =>
                n ? (
                  <button key={col} className="cal-more" style={{ gridColumn: col + 1, gridRow: visibleLanes + 1 }} onClick={() => setExpanded(true)}>
                    {n} more
                  </button>
                ) : null
              )}
            </div>
          </div>
        </div>

        <div className="tg-body" style={{ height: HOUR_HEIGHT * 24 }}>
          <div className="tg-gutter">
            {Array.from({ length: 23 }, (_, i) => (
              <div key={i} className="hour-label" style={{ top: (i + 1) * HOUR_HEIGHT }}>
                {format(new Date(2000, 0, 1, i + 1), 'h a')}
              </div>
            ))}
          </div>
          <div className="tg-cols" ref={colsRef}>
            {days.map((day) => {
              const placed = layoutDay(timedSegments(shown, day))
              const showGhost = ghost && !isSpanning(ghost) && isSameDay(ghost.start, day)
              return (
                <div
                  key={day.toISOString()}
                  className="tg-col"
                  onPointerDown={(e) => e.target === e.currentTarget && begin('create', 'time', e)}
                >
                  {placed.map(({ item: seg, column, columns }) => {
                    const item = seg.item
                    const minutes = seg.end - seg.start
                    const compact = minutes <= 35
                    const endsToday = item.end <= addDays(day, 1)
                    const style = {
                      top: (seg.start / 60) * HOUR_HEIGHT,
                      height: Math.max((minutes / 60) * HOUR_HEIGHT - 1, 14),
                      left: `${(column / columns) * 100}%`,
                      width: `calc(${100 / columns}% - ${column === columns - 1 ? 8 : 0}px)`,
                      '--ev': item.color,
                      color: item.kind === 'event' ? textOn(item.color) : undefined
                    } as React.CSSProperties
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        className={clsx(
                          'tg-event',
                          item.kind,
                          compact && 'compact',
                          item.end < now && 'past',
                          item.id === selectedId && 'selected',
                          item.id === draggingId && 'dragging'
                        )}
                        style={style}
                        onPointerDown={(e) => begin('move', 'time', e, item)}
                        onClick={(e) => open(item, e)}
                        onKeyDown={keyOpen(item)}
                      >
                        {item.kind === 'task' && check(item.id)}
                        {compact ? (
                          <span className="ev-line">
                            <span className="ev-title">{item.title}</span>, {shortTime(item.start)}
                          </span>
                        ) : (
                          <span className="ev-body">
                            <span className="ev-title">{item.title}</span>
                            <span className="ev-time">{timeRange(item.start, item.end)}</span>
                            {item.kind === 'event' && item.event.location && <span className="ev-time">{item.event.location}</span>}
                          </span>
                        )}
                        {item.kind === 'event' && endsToday && (
                          <div className="tg-resize" onPointerDown={(e) => begin('resize', 'time', e, item)} />
                        )}
                      </div>
                    )
                  })}
                  {showGhost && ghost && (
                    <div
                      className="tg-event ghost calendar-draft"
                      style={{
                        top: ((ghost.start.getHours() * 60 + ghost.start.getMinutes()) / 60) * HOUR_HEIGHT,
                        height: Math.max(((ghost.end.getTime() - ghost.start.getTime()) / 3600_000) * HOUR_HEIGHT - 1, 14)
                      }}
                    >
                      <span className="ev-body">
                        <span className="ev-title">{ghost.title || '(No title)'}</span>
                        <span className="ev-time">{timeRange(ghost.start, ghost.end)}</span>
                      </span>
                    </div>
                  )}
                  {isSameDay(day, now) && (
                    <div className="now-line" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
