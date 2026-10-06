import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { BiblePassage } from '@shared/types'
import { api } from '@renderer/lib/api'
import { useStore } from '@renderer/store/useStore'
import { Modal } from './Modal'

/** Asks for a reference, previews it from the ESV API, and hands it to whoever opened the picker. */
export function PassagePicker() {
  const onPick = useStore((s) => s.passagePicker)
  const close = useStore((s) => s.closePassagePicker)
  const [reference, setReference] = useState('')
  const [passage, setPassage] = useState<BiblePassage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lookedUp, setLookedUp] = useState('')

  useEffect(() => {
    if (onPick) {
      setReference('')
      setPassage(null)
      setError(null)
    }
  }, [onPick])

  const lookup = async () => {
    if (!reference.trim()) return
    setLoading(true)
    setError(null)
    try {
      setPassage(await api.bible.passage(reference))
      setLookedUp(reference)
    } catch (err) {
      setPassage(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const insert = () => {
    if (passage && onPick) {
      onPick(passage)
      close()
    }
  }

  return (
    <Modal open={Boolean(onPick)} onClose={close} top className="passage-picker">
      <form
        className="passage-search"
        onSubmit={(e) => {
          e.preventDefault()
          if (passage && lookedUp === reference) insert()
          else void lookup()
        }}
      >
        <BookOpen size={18} className="muted" />
        <input
          autoFocus
          className="passage-input"
          placeholder="Passage, e.g. Romans 8:1-11"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <button className="button secondary" type="submit" disabled={loading}>
          {loading ? 'Loading…' : passage && lookedUp === reference ? 'Insert' : 'Look up'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {passage && (
        <div className="passage-preview">
          <div className="passage-ref">{passage.reference} (ESV)</div>
          <p>
            {passage.verses.map((v, i) => (
              <span key={i}>
                {v.number !== null && <sup>{v.number}</sup>}
                {v.text}{' '}
              </span>
            ))}
          </p>
          <div className="modal-footer">
            <button className="button secondary" onClick={close}>
              Cancel
            </button>
            <button className="button primary" onClick={insert}>
              Insert passage
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
