// Pure date maths behind the Google-Calendar-style views: which days a view
// shows, how items map onto days, all-day/multi-day bar layout, drag maths and
// Google's compact time formatting. Kept free of React so it can be unit-tested.

import {
  addDays,
  addMinutes,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import type { CalendarEvent, Task } from '@shared/types'

export type CalendarMode = 'day' | '4day' | 'week' | 'month' | 'schedule'

export const MODES: { mode: CalendarMode; label: string; key: string }[] = [
  { mode: 'day', label: 'Day', key: 'D' },
  { mode: 'week', label: 'Week', key: 'W' },
  { mode: 'month', label: 'Month', key: 'M' },
  { mode: 'schedule', label: 'Schedule', key: 'A' },
  { mode: '4day', label: '4 days', key: 'X' }
]

/** Google Calendar's event colours, by their Google names. */
export const EVENT_COLORS = [
  { name: 'Tomato', value: '#d50000' },
  { name: 'Flamingo', value: '#e67c73' },
  { name: 'Tangerine', value: '#f4511e' },
  { name: 'Banana', value: '#f6bf26' },
  { name: 'Sage', value: '#33b679' },
  { name: 'Basil', value: '#0b8043' },
  { name: 'Peacock', value: '#039be5' },
  { name: 'Blueberry', value: '#3f51b5' },
  { name: 'Lavender', value: '#7986cb' },
  { name: 'Grape', value: '#8e24aa' },
  { name: 'Graphite', value: '#616161' }
]

export const DEFAULT_EVENT_COLOR = '#039be5'
const DEFAULT_TASK_COLOR = '#4285f4'

export type CalItem =
  | { kind: 'event'; id: string; title: string; start: Date; end: Date; allDay: boolean; color: string; event: CalendarEvent }
  | { kind: 'task'; id: string; title: string; start: Date; end: Date; allDay: boolean; color: string; task: Task }

export const TASK_MINUTES = 30

/** Turns events and scheduled open tasks into one list of calendar items. */
export function buildItems(
  events: CalendarEvent[],
  tasks: Task[],
  projectColor: (projectId?: string) => string | undefined = () => undefined
): CalItem[] {
  const items: CalItem[] = []
  for (const event of events) {
    items.push({
      kind: 'event',
      id: event.id,
      title: event.title || '(No title)',
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay,
      color: event.color ?? DEFAULT_EVENT_COLOR,
      event
    })
  }
  for (const task of tasks) {
    if (task.completed || !task.due) continue
    const day = parseDay(task.due.date)
    let start = day
    let end = addDays(day, 1)
    if (task.due.time) {
      const [h, m] = task.due.time.split(':').map(Number)
      start = addMinutes(day, h * 60 + m)
      end = addMinutes(start, TASK_MINUTES)
    }
    items.push({
      kind: 'task',
      id: task.id,
      title: task.content,
      start,
      end,
      allDay: !task.due.time,
      color: projectColor(task.projectId) ?? DEFAULT_TASK_COLOR,
      task
    })
  }
  return items
}

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** First and last calendar day an item touches (end is exclusive). */
export function itemDays(item: { start: Date; end: Date }): { first: Date; last: Date } {
  const first = startOfDay(item.start)
  const lastInstant = item.end > item.start ? new Date(item.end.getTime() - 1) : item.start
  return { first, last: startOfDay(lastInstant) }
}

/**
 * Items Google draws as bars in the all-day row (and as filled bars in month
 * view): all-day items and anything lasting a day or more.
 */
export function isSpanning(item: { start: Date; end: Date; allDay: boolean }): boolean {
  return item.allDay || item.end.getTime() - item.start.getTime() >= 24 * 3600_000
}

export function touchesDay(item: { start: Date; end: Date }, day: Date): boolean {
  const { first, last } = itemDays(item)
  return first <= day && day <= last
}

export interface TimedSegment<T> {
  id: string
  item: T
  /** Minutes from midnight, clipped to the day. */
  start: number
  end: number
}

/** Timed (non-spanning) items on a day, clipped to that day, in minutes. */
export function timedSegments<T extends CalItem>(items: T[], day: Date): TimedSegment<T>[] {
  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)
  const out: TimedSegment<T>[] = []
  for (const item of items) {
    if (isSpanning(item) || item.end <= dayStart || item.start >= dayEnd) continue
    const start = item.start <= dayStart ? 0 : minutesInto(item.start, dayStart)
    const end = item.end >= dayEnd ? 24 * 60 : minutesInto(item.end, dayStart)
    out.push({ id: item.id, item, start, end: Math.max(end, start + 15) })
  }
  return out
}

const minutesInto = (d: Date, dayStart: Date) => Math.round((d.getTime() - dayStart.getTime()) / 60000)

export interface SpanPlacement<T> {
  item: T
  startCol: number
  endCol: number
  lane: number
  /** The item started before / continues after this row. */
  clippedStart: boolean
  clippedEnd: boolean
}

/**
 * Lays items out as horizontal bars over a row of consecutive days (a week in
 * month view, the all-day row in week view). Longer items go first and each
 * takes the lowest free lane, like Google Calendar.
 */
export function layoutSpans<T extends { start: Date; end: Date; allDay: boolean; title: string }>(
  items: T[],
  rowDays: Date[]
): SpanPlacement<T>[] {
  if (rowDays.length === 0) return []
  const rowStart = startOfDay(rowDays[0])
  const lastCol = rowDays.length - 1
  const placed: SpanPlacement<T>[] = []
  for (const item of items) {
    const { first, last } = itemDays(item)
    const a = differenceInCalendarDays(first, rowStart)
    const b = differenceInCalendarDays(last, rowStart)
    if (b < 0 || a > lastCol) continue
    placed.push({
      item,
      startCol: Math.max(a, 0),
      endCol: Math.min(b, lastCol),
      lane: 0,
      clippedStart: a < 0,
      clippedEnd: b > lastCol
    })
  }
  placed.sort(
    (x, y) =>
      x.startCol - y.startCol ||
      y.endCol - y.startCol - (x.endCol - x.startCol) ||
      Number(isSpanning(y.item)) - Number(isSpanning(x.item)) ||
      x.item.start.getTime() - y.item.start.getTime() ||
      x.item.title.localeCompare(y.item.title)
  )
  const laneEnds: number[] = []
  for (const p of placed) {
    let lane = laneEnds.findIndex((end) => end < p.startCol)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = p.endCol
    p.lane = lane
  }
  return placed
}

/** The days a time-grid view shows. */
export function visibleDays(mode: CalendarMode, anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const day = startOfDay(anchor)
  if (mode === 'day') return [day]
  if (mode === '4day') return Array.from({ length: 4 }, (_, i) => addDays(day, i))
  if (mode === 'month') {
    const first = startOfWeek(startOfMonth(day), { weekStartsOn })
    const last = endOfWeek(endOfMonth(day), { weekStartsOn })
    return Array.from({ length: differenceInCalendarDays(last, first) + 1 }, (_, i) => addDays(first, i))
  }
  if (mode === 'schedule') {
    return Array.from({ length: differenceInCalendarDays(addMonths(day, 1), day) }, (_, i) => addDays(day, i))
  }
  const first = startOfWeek(day, { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** Where the "previous"/"next" arrows take you. */
export function stepAnchor(mode: CalendarMode, anchor: Date, dir: 1 | -1): Date {
  switch (mode) {
    case 'day':
      return addDays(anchor, dir)
    case '4day':
      return addDays(anchor, 4 * dir)
    case 'week':
      return addDays(anchor, 7 * dir)
    case 'month':
    case 'schedule':
      return addMonths(anchor, dir)
  }
}

/** Header title, formatted the way Google does ("Sep – Oct 2026"). */
export function viewTitle(mode: CalendarMode, anchor: Date, days: Date[]): string {
  if (mode === 'day') return format(anchor, 'MMMM d, yyyy')
  if (mode === 'month') return format(anchor, 'MMMM yyyy')
  const first = days[0]
  const last = days[days.length - 1]
  if (isSameMonth(first, last)) return format(first, 'MMMM yyyy')
  if (isSameYear(first, last)) return `${format(first, 'MMM')} – ${format(last, 'MMM yyyy')}`
  return `${format(first, 'MMM yyyy')} – ${format(last, 'MMM yyyy')}`
}

/** Google's compact time: "9am", "9:30pm". */
export function shortTime(d: Date): string {
  return format(d, d.getMinutes() === 0 ? 'haaa' : 'h:mmaaa')
}

/** Google's compact range: "9 – 10am", "9:30 – 10:15am", "11am – 1pm". */
export function timeRange(start: Date, end: Date): string {
  const sameHalf = format(start, 'a') === format(end, 'a') && differenceInCalendarDays(end, start) === 0
  const startText = sameHalf ? format(start, start.getMinutes() === 0 ? 'h' : 'h:mm') : shortTime(start)
  return `${startText} – ${shortTime(end)}`
}

/** "Wednesday, October 7 ⋅ 7 – 8:30pm", or a date range for multi-day items. */
export function describeWhen(item: { start: Date; end: Date; allDay: boolean }): string {
  const { first, last } = itemDays(item)
  const sameDay = first.getTime() === last.getTime()
  if (item.allDay) {
    return sameDay ? format(first, 'EEEE, MMMM d') : `${format(first, 'MMMM d')} – ${format(last, 'MMMM d, yyyy')}`
  }
  if (sameDay || (item.end.getTime() === addDays(first, 1).getTime())) {
    return `${format(item.start, 'EEEE, MMMM d')} ⋅ ${timeRange(item.start, item.end)}`
  }
  return `${format(item.start, 'MMMM d, yyyy, ')}${shortTime(item.start)} – ${format(item.end, 'MMMM d, yyyy, ')}${shortTime(item.end)}`
}

/** "GMT-07", as shown above Google's hour gutter. */
export function gmtLabel(d = new Date()): string {
  const offset = -d.getTimezoneOffset()
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = abs % 60
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

/** White or near-black text, whichever reads better on a hex background. */
export function textOn(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1]
  if (!hex) return '#fff'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.66 ? '#202124' : '#fff'
}

// ------------------------------------------------------------- drag maths

/** A pointer position over a calendar: day column and minutes into the day (0 for day-only zones). */
export interface GridPos {
  col: number
  minutes: number
}

export type DragZone = 'time' | 'day'

const snap = (minutes: number, step: number, mode: 'floor' | 'round' | 'ceil') =>
  Math[mode](minutes / step) * step

/** Range a click or drag on empty space creates. */
export function createRange(
  zone: DragZone,
  days: Date[],
  from: GridPos,
  to: GridPos,
  moved: boolean
): { start: Date; end: Date; allDay: boolean } {
  if (zone === 'day') {
    const a = Math.min(from.col, to.col)
    const b = Math.max(from.col, to.col)
    return { start: days[a], end: addDays(days[b], 1), allDay: true }
  }
  const day = days[from.col]
  if (!moved) {
    const start = Math.min(snap(from.minutes, 30, 'floor'), 23 * 60)
    return { start: addMinutes(day, start), end: addMinutes(day, start + 60), allDay: false }
  }
  const lo = Math.min(from.minutes, to.minutes)
  const hi = Math.max(from.minutes, to.minutes)
  const start = snap(lo, 15, 'floor')
  const end = Math.min(Math.max(snap(hi, 15, 'ceil'), start + 15), 24 * 60)
  return { start: addMinutes(day, start), end: addMinutes(day, end), allDay: false }
}

/** New start/end after dragging an item from one grid position to another. */
export function moveRange(zone: DragZone, start: Date, end: Date, from: GridPos, to: GridPos): { start: Date; end: Date } {
  const dDays = to.col - from.col
  const dMinutes = zone === 'time' ? snap(to.minutes, 15, 'round') - snap(from.minutes, 15, 'round') : 0
  return { start: addMinutes(addDays(start, dDays), dMinutes), end: addMinutes(addDays(end, dDays), dMinutes) }
}

/** New end after dragging an item's bottom edge. */
export function resizeEnd(days: Date[], start: Date, to: GridPos): Date {
  const end = addMinutes(days[to.col], snap(to.minutes, 15, 'round'))
  const min = addMinutes(start, 15)
  return end < min ? min : end
}
