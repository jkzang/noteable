import { useLayoutEffect, useRef, useState } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { isSpanning, layoutSpans, shortTime, textOn, type CalItem, type DragZone, type GridPos } from '@renderer/lib/calendar'
import type { Draft } from './TimeGrid'
import { useCalendarDrag, type Range } from './useCalendarDrag'

const DATE_ROW = 26
const LANE = 22

interface Props {
  anchor: Date
  days: Date[]
  items: CalItem[]
  now: Date
  draft: Draft | null
  selectedId: string | null
  onPickDay(day: Date): void
  onCreate(range: Range): void
  onChange(item: CalItem, start: Date, end: Date): void
  onOpen(item: CalItem, el: Element): void
  onMore(day: Date, el: Element): void
  onToggleTask(id: string): void
}

/** Month view: weeks of day cells with bars for all-day items and dotted chips for timed ones. */
export function MonthGrid({ anchor, days, items, now, draft, selectedId, onPickDay, onCreate, onChange, onOpen, onMore, onToggleTask }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7))
  const [maxLanes, setMaxLanes] = useState(3)

  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const measure = () => {
      const rowHeight = el.clientHeight / weeks.length
      setMaxLanes(Math.max(1, Math.floor((rowHeight - DATE_ROW - 4) / LANE)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [weeks.length])

  const locate = (_zone: DragZone, x: number, y: number): GridPos | null => {
    const el = gridRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const row = Math.min(Math.max(Math.floor(((y - r.top) / r.height) * weeks.length), 0), weeks.length - 1)
    const col = Math.min(Math.max(Math.floor(((x - r.left) / r.width) * 7), 0), 6)
    return { col: row * 7 + col, minutes: 0 }
  }

  const { drag, begin, preview, creating, wasDragged } = useCalendarDrag({ days, locate, onCreate, onChange })
  const shown = preview(items)
  const ghost: Draft | null = creating ? { ...creating, title: '' } : draft
  const draggingId = drag && drag.type !== 'create' && drag.moved ? drag.item.id : null

  const open = (item: CalItem, e: React.MouseEvent | React.KeyboardEvent) => {
    if (!wasDragged()) onOpen(item, e.currentTarget)
  }

  type Entry = CalItem | (Draft & { kind: 'ghost'; id: 'ghost'; color: string })
  const entries: Entry[] = [...shown]
  if (ghost) entries.push({ ...ghost, kind: 'ghost', id: 'ghost', color: 'var(--blue)' })

  return (
    <div className="mg">
      <div className="mg-dows">
        {weeks[0]?.map((d) => (
          <div key={d.getDay()}>{format(d, 'EEE')}</div>
        ))}
      </div>
      <div className="mg-weeks" ref={gridRef} style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week) => {
          const placed = layoutSpans(entries, week)
          const covers = (p: (typeof placed)[number], col: number) => p.startCol <= col && col <= p.endCol
          const limit = week.map((_, col) => (placed.some((p) => p.lane >= maxLanes && covers(p, col)) ? maxLanes - 1 : maxLanes))
          const visible = (p: (typeof placed)[number]) => {
            for (let c = p.startCol; c <= p.endCol; c++) if (p.lane >= limit[c]) return false
            return true
          }
          const hidden = week.map((_, col) => placed.filter((p) => covers(p, col) && !visible(p)).length)
          return (
            <div key={week[0].toISOString()} className="mg-week">
              {week.map((day) => (
                <div
                  key={day.toISOString()}
                  className={clsx('mg-cell', !isSameMonth(day, anchor) && 'outside')}
                  onPointerDown={(e) => e.target === e.currentTarget && begin('create', 'day', e)}
                >
                  <button className={clsx('mg-date', isToday(day) && 'today')} onClick={() => onPickDay(day)}>
                    {day.getDate() === 1 ? format(day, 'MMM d') : day.getDate()}
                  </button>
                </div>
              ))}
              <div className="mg-items" style={{ top: DATE_ROW, gridTemplateRows: `repeat(${maxLanes}, ${LANE - 2}px)` }}>
                {placed.filter(visible).map(({ item, startCol, endCol, lane, clippedStart, clippedEnd }) => {
                  const style = { gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: lane + 1 } as React.CSSProperties
                  if (item.kind === 'ghost') {
                    return (
                      <div key="ghost" className="cal-bar ghost calendar-draft" style={style}>
                        {item.title || '(No title)'}
                      </div>
                    )
                  }
                  const bar = isSpanning(item)
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className={clsx(
                        bar ? 'cal-bar' : 'mg-chip',
                        item.kind,
                        clippedStart && 'clip-start',
                        clippedEnd && 'clip-end',
                        item.end < now && 'past',
                        item.id === selectedId && 'selected',
                        item.id === draggingId && 'dragging'
                      )}
                      style={{ ...style, '--ev': item.color, color: bar && item.kind === 'event' ? textOn(item.color) : undefined } as React.CSSProperties}
                      onPointerDown={(e) => begin('move', 'day', e, item)}
                      onClick={(e) => open(item, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') open(item, e)
                      }}
                    >
                      {item.kind === 'task' ? (
                        <button
                          className="mini-check"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleTask(item.id)
                          }}
                          title="Mark complete"
                        >
                          <Check size={9} strokeWidth={3} />
                        </button>
                      ) : (
                        !bar && <span className="dot" />
                      )}
                      {!item.allDay && <span className="bar-time">{shortTime(item.start)}</span>}
                      <span className="bar-title">{item.title}</span>
                    </div>
                  )
                })}
                {hidden.map((n, col) =>
                  n ? (
                    <button
                      key={col}
                      className="cal-more"
                      style={{ gridColumn: col + 1, gridRow: Math.max(maxLanes, 1) }}
                      onClick={(e) => onMore(week[col], e.currentTarget)}
                    >
                      {n} more
                    </button>
                  ) : null
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
