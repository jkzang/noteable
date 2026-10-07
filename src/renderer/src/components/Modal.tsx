import { useEffect } from 'react'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose(): void
  children: React.ReactNode
  className?: string
  /** Align near the top like Notion's search, instead of centred. */
  top?: boolean
}

export function Modal({ open, onClose, children, className, top }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={clsx('modal-backdrop', top && 'top')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={clsx('modal', className)} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}
