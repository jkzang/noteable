import { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from 'react'
import clsx from 'clsx'
import { referenceHint } from '@shared/bibleRef'
import type { SlashItem } from './slashItems'

export interface SlashMenuProps {
  items: SlashItem[]
  query: string
  command(item: SlashItem): void
}

export interface SlashMenuHandle {
  onKeyDown(event: KeyboardEvent): boolean
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu({ items, query, command }, ref) {
  const [selected, setSelected] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => setSelected(0), [items])

  useEffect(() => {
    listRef.current?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (!items.length) return false
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        command(items[selected])
        return true
      }
      return false
    }
  }))

  if (!items.length) return <div className="slash-menu empty">{referenceHint(query) ?? 'No matching blocks'}</div>

  return (
    <div className="slash-menu" ref={listRef}>
      {items.map((item, i) => {
        const group = item.group ?? 'Basic blocks'
        const newGroup = i === 0 || group !== (items[i - 1].group ?? 'Basic blocks')
        return (
          <Fragment key={item.title}>
            {newGroup && <div className="slash-menu-heading">{group}</div>}
            <button
              className={clsx('slash-item', i === selected && 'selected')}
              onMouseEnter={() => setSelected(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                command(item)
              }}
            >
              <span className="slash-icon">
                <item.icon size={18} />
              </span>
              <span className="slash-text">
                <span className="slash-title">{item.title}</span>
                <span className="slash-desc">{item.description}</span>
              </span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
})
