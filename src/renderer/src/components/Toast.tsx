import { useEffect } from 'react'
import { useStore } from '@renderer/store/useStore'

export function Toast() {
  const toast = useStore((s) => s.toast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      if (useStore.getState().toast?.id === toast.id) useStore.setState({ toast: null })
    }, 5000)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          className="toast-undo"
          onClick={() => {
            toast.undo!()
            useStore.setState({ toast: null })
          }}
        >
          Undo
        </button>
      )}
    </div>
  )
}
