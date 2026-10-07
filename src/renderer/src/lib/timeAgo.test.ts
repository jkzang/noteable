import { describe, expect, it } from 'vitest'
import { timeAgo } from './timeAgo'

describe('timeAgo', () => {
  const now = new Date(2026, 9, 7, 15, 0)
  const ago = (ms: number) => timeAgo(now.getTime() - ms, now)

  it('uses short relative labels', () => {
    expect(ago(20_000)).toBe('just now')
    expect(ago(5 * 60_000)).toBe('5m ago')
    expect(ago(3 * 3_600_000)).toBe('3h ago')
    expect(timeAgo(new Date(2026, 9, 6, 22, 0), now)).toBe('yesterday')
    expect(timeAgo(new Date(2026, 9, 3, 9, 0), now)).toBe('4d ago')
    expect(timeAgo(new Date(2026, 8, 20), now)).toBe('Sep 20')
    expect(timeAgo(new Date(2025, 8, 20), now)).toBe('Sep 20, 2025')
  })
})
