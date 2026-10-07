import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

interface Props {
  /** Element the card sits beside; looked up after render so freshly drawn blocks work. */
  anchor(): Element | null
  onClose(): void
  children: React.ReactNode
  className?: string
}

const GAP = 8
const MARGIN = 12

/** A Google-Calendar-style floating card placed beside an event block. */
export function Popover({ anchor, onClose, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const close = useRef(onClose)
  close.current = onClose

  useLayoutEffect(() => {
    const place = () => {
      const el = ref.current
      const a = anchor()?.getBoundingClientRect()
      if (!el || !a) return
      const { width, height } = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      let left: number
      let top = Math.min(Math.max(a.top, MARGIN), vh - height - MARGIN)
      if (a.right + GAP + width <= vw - MARGIN) left = a.right + GAP
      else if (a.left - GAP - width >= MARGIN) left = a.left - GAP - width
      else {
        // No room either side (e.g. a full-width day view): centre over the anchor.
        left = Math.min(Math.max(a.left + a.width / 2 - width / 2, MARGIN), vw - width - MARGIN)
        top = Math.min(Math.max(a.top + 24, MARGIN), vh - height - MARGIN)
      }
      setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  })

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close.current()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return createPortal(
    <div
      ref={ref}
      className={clsx('cal-popover', className)}
      role="dialog"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, opacity: 0 }}
    >
      {children}
    </div>,
    document.body
  )
}
