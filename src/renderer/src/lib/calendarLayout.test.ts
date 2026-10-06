import { describe, expect, it } from 'vitest'
import { layoutDay } from './calendarLayout'

describe('layoutDay', () => {
  it('keeps non-overlapping items full width', () => {
    const out = layoutDay([
      { id: 'a', start: 60, end: 120 },
      { id: 'b', start: 120, end: 180 }
    ])
    expect(out.map((p) => [p.item.id, p.column, p.columns])).toEqual([
      ['a', 0, 1],
      ['b', 0, 1]
    ])
  })

  it('splits overlapping items into columns per cluster', () => {
    const out = layoutDay([
      { id: 'a', start: 60, end: 180 },
      { id: 'b', start: 90, end: 120 },
      { id: 'c', start: 130, end: 150 },
      { id: 'd', start: 300, end: 360 }
    ])
    expect(out.map((p) => [p.item.id, p.column, p.columns])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 1, 2],
      ['d', 0, 1]
    ])
  })
})
