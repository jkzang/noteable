import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Task } from '@shared/types'
import {
  buildItems,
  createRange,
  describeWhen,
  isSpanning,
  itemDays,
  layoutSpans,
  moveRange,
  resizeEnd,
  stepAnchor,
  textOn,
  timeRange,
  timedSegments,
  viewTitle,
  visibleDays
} from './calendar'

const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m)
const item = (title: string, start: Date, end: Date, allDay = false) => ({ title, start, end, allDay })

describe('itemDays / isSpanning', () => {
  it('treats the end as exclusive, so all-day events ending at midnight stay on one day', () => {
    expect(itemDays(item('a', at(7), at(8), true))).toEqual({ first: at(7), last: at(7) })
    // Legacy all-day events were saved ending 23:59 the same day.
    expect(itemDays(item('a', at(7), at(7, 23, 59), true))).toEqual({ first: at(7), last: at(7) })
    expect(itemDays(item('a', at(7, 22), at(8, 2)))).toEqual({ first: at(7), last: at(8) })
  })

  it('draws all-day items and items lasting a day or more as bars', () => {
    expect(isSpanning(item('a', at(7, 9), at(7, 10)))).toBe(false)
    expect(isSpanning(item('a', at(7, 9), at(8, 9)))).toBe(true)
    expect(isSpanning(item('a', at(7), at(8), true))).toBe(true)
  })
})

describe('buildItems', () => {
  it('turns timed tasks into 30-minute blocks and undated-time tasks into all-day items', () => {
    const task = (id: string, due?: Task['due'], completed = false) =>
      ({ id, content: id, priority: 4, labels: [], completed, order: 0, createdAt: '', updatedAt: '', due }) as Task
    const event: CalendarEvent = {
      id: 'e',
      title: '',
      start: at(7, 9).toISOString(),
      end: at(7, 10).toISOString(),
      allDay: false,
      calendarId: 'local',
      updatedAt: ''
    }
    const items = buildItems(
      [event],
      [task('timed', { date: '2026-10-07', time: '14:30' }), task('day', { date: '2026-10-08' }), task('done', { date: '2026-10-07' }, true), task('none')]
    )
    expect(items.map((i) => [i.id, i.title, i.allDay, i.start, i.end])).toEqual([
      ['e', '(No title)', false, at(7, 9), at(7, 10)],
      ['timed', 'timed', false, at(7, 14, 30), at(7, 15)],
      ['day', 'day', true, at(8), at(9)]
    ])
  })
})

describe('timedSegments', () => {
  it('clips overnight items to each day and skips spanning ones', () => {
    const items = buildItems(
      [
        { id: 'late', title: 'late', start: at(7, 22).toISOString(), end: at(8, 1).toISOString(), allDay: false, calendarId: 'local', updatedAt: '' },
        { id: 'trip', title: 'trip', start: at(7).toISOString(), end: at(9).toISOString(), allDay: true, calendarId: 'local', updatedAt: '' }
      ],
      []
    )
    expect(timedSegments(items, at(7)).map((s) => [s.id, s.start, s.end])).toEqual([['late', 22 * 60, 24 * 60]])
    expect(timedSegments(items, at(8)).map((s) => [s.id, s.start, s.end])).toEqual([['late', 0, 60]])
  })
})

describe('layoutSpans', () => {
  const week = Array.from({ length: 7 }, (_, i) => at(4 + i)) // Sun Oct 4 – Sat Oct 10

  it('places longer bars first and stacks overlaps into lanes', () => {
    const out = layoutSpans(
      [
        item('short', at(6), at(7), true),
        item('long', at(5), at(9), true),
        item('other', at(8), at(9), true),
        item('lunch', at(6, 12), at(6, 13))
      ],
      week
    )
    expect(out.map((p) => [p.item.title, p.startCol, p.endCol, p.lane])).toEqual([
      ['long', 1, 4, 0],
      ['short', 2, 2, 1],
      ['lunch', 2, 2, 2],
      ['other', 4, 4, 1]
    ])
  })

  it('clips bars to the row and flags the cut ends', () => {
    const [p] = layoutSpans([item('trip', at(1), at(20), true)], week)
    expect([p.startCol, p.endCol, p.clippedStart, p.clippedEnd]).toEqual([0, 6, true, true])
    expect(layoutSpans([item('gone', at(1), at(3), true)], week)).toEqual([])
  })
})

describe('views', () => {
  it('lists the days each mode shows', () => {
    expect(visibleDays('day', at(7, 15), 0)).toEqual([at(7)])
    expect(visibleDays('4day', at(7), 0)).toEqual([at(7), at(8), at(9), at(10)])
    expect(visibleDays('week', at(7), 0)[0]).toEqual(at(4))
    expect(visibleDays('week', at(7), 1)[0]).toEqual(at(5))
    const month = visibleDays('month', at(7), 0)
    expect(month[0]).toEqual(new Date(2026, 8, 27))
    expect(month.length % 7).toBe(0)
    expect(month[month.length - 1]).toEqual(at(31))
  })

  it('steps by the size of the view', () => {
    expect(stepAnchor('week', at(7), 1)).toEqual(at(14))
    expect(stepAnchor('4day', at(7), -1)).toEqual(at(3))
    expect(stepAnchor('month', at(31), 1)).toEqual(new Date(2026, 10, 30))
  })

  it('formats titles like Google', () => {
    expect(viewTitle('day', at(7), [at(7)])).toBe('October 7, 2026')
    expect(viewTitle('week', at(7), visibleDays('week', at(7), 0))).toBe('October 2026')
    expect(viewTitle('week', at(1), visibleDays('week', at(1), 0))).toBe('Sep – Oct 2026')
    const ny = new Date(2026, 11, 31)
    expect(viewTitle('week', ny, visibleDays('week', ny, 0))).toBe('Dec 2026 – Jan 2027')
  })
})

describe('time formatting', () => {
  it('uses compact ranges', () => {
    expect(timeRange(at(7, 9), at(7, 10))).toBe('9 – 10am')
    expect(timeRange(at(7, 9, 30), at(7, 10, 15))).toBe('9:30 – 10:15am')
    expect(timeRange(at(7, 11), at(7, 13))).toBe('11am – 1pm')
  })

  it('describes when an item happens', () => {
    expect(describeWhen(item('a', at(7, 19), at(7, 20, 30)))).toBe('Wednesday, October 7 ⋅ 7 – 8:30pm')
    expect(describeWhen(item('a', at(7), at(8), true))).toBe('Wednesday, October 7')
    expect(describeWhen(item('a', at(7), at(10), true))).toBe('October 7 – October 9, 2026')
  })

  it('picks readable text colours', () => {
    expect(textOn('#039be5')).toBe('#fff')
    expect(textOn('#f6bf26')).toBe('#202124')
    expect(textOn('var(--accent)')).toBe('#fff')
  })
})

describe('drag maths', () => {
  const days = [at(7), at(8), at(9)]

  it('creates a one-hour event on click and a snapped range on drag', () => {
    expect(createRange('time', days, { col: 1, minutes: 9 * 60 + 40 }, { col: 1, minutes: 9 * 60 + 40 }, false)).toEqual({
      start: at(8, 9, 30),
      end: at(8, 10, 30),
      allDay: false
    })
    expect(createRange('time', days, { col: 0, minutes: 11 * 60 + 5 }, { col: 2, minutes: 9 * 60 + 50 }, true)).toEqual({
      start: at(7, 9, 45),
      end: at(7, 11, 15),
      allDay: false
    })
    expect(createRange('day', days, { col: 2, minutes: 0 }, { col: 0, minutes: 0 }, true)).toEqual({
      start: at(7),
      end: at(10),
      allDay: true
    })
  })

  it('moves across days and times in 15-minute steps', () => {
    expect(moveRange('time', at(7, 9), at(7, 10), { col: 0, minutes: 9 * 60 + 20 }, { col: 2, minutes: 13 * 60 + 50 })).toEqual({
      start: at(9, 13, 30),
      end: at(9, 14, 30)
    })
    expect(moveRange('day', at(7), at(8), { col: 0, minutes: 0 }, { col: 1, minutes: 0 })).toEqual({ start: at(8), end: at(9) })
  })

  it('resizes to the nearest 15 minutes but never below 15 minutes', () => {
    expect(resizeEnd(days, at(7, 9), { col: 0, minutes: 11 * 60 + 8 })).toEqual(at(7, 11, 15))
    expect(resizeEnd(days, at(7, 9), { col: 0, minutes: 8 * 60 })).toEqual(at(7, 9, 15))
  })
})
