import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose(): void
  /** The button the popover hangs off. */
  anchor: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

/** A dropdown anchored under a button; closes on outside click or Escape. */
export function Popover({ open, onClose, anchor, children, align = 'left', className }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div className="popover-anchor" ref={ref}>
      {anchor}
      {open && <div className={clsx('popover', align, className)}>{children}</div>}
    </div>
  )
}

export function MenuItem(props: { icon: React.ReactNode; label: string; onClick(): void; danger?: boolean }) {
  return (
    <button className={clsx('menu-item', props.danger && 'danger')} onClick={props.onClick}>
      <span className="menu-icon">{props.icon}</span>
      {props.label}
    </button>
  )
}
