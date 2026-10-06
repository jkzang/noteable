import { useCallback, useEffect, useRef } from 'react'

/**
 * Debounced saving that never loses the last edit: pending changes are
 * flushed on unmount, and `flush()` can be awaited before e.g. a rename.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>, delay = 500) {
  const pending = useRef<{ value: T } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const job = pending.current
    pending.current = null
    if (job) await saveRef.current(job.value)
  }, [])

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), delay)
    },
    [delay, flush]
  )

  useEffect(() => () => void flush(), [flush])

  return { schedule, flush }
}
