import { useEffect, useRef, useState } from 'react'
import { createRange, moveRange, resizeEnd, type CalItem, type DragZone, type GridPos } from '@renderer/lib/calendar'

export type Drag =
  | { type: 'create'; zone: DragZone; from: GridPos; to: GridPos; moved: boolean }
  | { type: 'move'; zone: DragZone; item: CalItem; from: GridPos; to: GridPos; moved: boolean }
  | { type: 'resize'; zone: 'time'; item: CalItem; from: GridPos; to: GridPos; moved: boolean }

export interface Range {
  start: Date
  end: Date
  allDay: boolean
}

interface Options {
  days: Date[]
  /** Maps a pointer position to a day column (+ minutes for the time zone). */
  locate(zone: DragZone, x: number, y: number): GridPos | null
  onCreate(range: Range): void
  onChange(item: CalItem, start: Date, end: Date): void
}

/**
 * Google-Calendar-style pointer interactions: drag on empty space to create,
 * drag an item to move it, drag its bottom edge to resize it.
 */
export function useCalendarDrag(options: Options) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const opts = useRef(options)
  opts.current = options
  const origin = useRef({ x: 0, y: 0 })
  const suppressClick = useRef(false)

  const update = (next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const active = drag !== null
  useEffect(() => {
    if (!active) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const to = opts.current.locate(d.zone, e.clientX, e.clientY) ?? d.to
      const moved = d.moved || Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 4
      if (to.col !== d.to.col || to.minutes !== d.to.minutes || moved !== d.moved) update({ ...d, to, moved })
    }
    const onUp = () => {
      const d = dragRef.current
      update(null)
      if (!d) return
      const { days, onCreate, onChange } = opts.current
      if (d.type === 'create') {
        onCreate(createRange(d.zone, days, d.from, d.to, d.moved))
        return
      }
      if (!d.moved) return
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
      const next = result(d, days)
      if (next.start.getTime() !== d.item.start.getTime() || next.end.getTime() !== d.item.end.getTime()) {
        onChange(d.item, next.start, next.end)
      }
    }
    const cancel = () => update(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])

  const begin = (type: Drag['type'], zone: DragZone, e: React.PointerEvent, item?: CalItem) => {
    if (e.button !== 0) return
    const pos = opts.current.locate(zone, e.clientX, e.clientY)
    if (!pos) return
    e.preventDefault()
    e.stopPropagation()
    origin.current = { x: e.clientX, y: e.clientY }
    if (type === 'create') update({ type, zone, from: pos, to: pos, moved: false })
    else if (type === 'resize' && item) update({ type, zone: 'time', item, from: pos, to: pos, moved: false })
    else if (item) update({ type: 'move', zone, item, from: pos, to: pos, moved: false })
  }

  /** Items with the one being dragged shown at its new position. */
  const preview = (items: CalItem[]): CalItem[] => {
    if (!drag || drag.type === 'create' || !drag.moved) return items
    const next = result(drag, options.days)
    return items.map((i) => (i.id === drag.item.id ? { ...i, ...next } : i))
  }

  /** The range a create-drag currently covers. */
  const creating: Range | null =
    drag?.type === 'create' ? createRange(drag.zone, options.days, drag.from, drag.to, drag.moved) : null

  return {
    drag,
    begin,
    preview,
    creating,
    /** True right after a drag, so the click that ends it doesn't also open the item. */
    wasDragged: () => suppressClick.current
  }
}

function result(d: Exclude<Drag, { type: 'create' }>, days: Date[]) {
  if (d.type === 'resize') return { start: d.item.start, end: resizeEnd(days, d.item.start, d.to) }
  return moveRange(d.zone, d.item.start, d.item.end, d.from, d.to)
}
