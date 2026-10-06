import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion'
import { SlashMenu, type SlashMenuHandle, type SlashMenuProps } from './SlashMenu'
import { filterSlashItems, type SlashItem } from './slashItems'

function place(el: HTMLElement, clientRect: SuggestionProps['clientRect']) {
  const rect = clientRect?.()
  if (!rect) return
  const virtual = { getBoundingClientRect: () => rect }
  void computePosition(virtual, el, {
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift({ padding: 8 })]
  }).then(({ x, y }) => {
    Object.assign(el.style, { left: `${x}px`, top: `${y}px` })
  })
}

/** Notion-style "/" command menu. */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    const options: Omit<SuggestionOptions<SlashItem>, 'editor'> = {
      char: '/',
      allowSpaces: false,
      startOfLine: false,
      items: ({ query }) => filterSlashItems(query),
      command: ({ editor, range, props }) => props.run(editor, range),
      render: () => {
        let renderer: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null
        return {
          onStart: (props) => {
            renderer = new ReactRenderer(SlashMenu, { props, editor: props.editor })
            const el = renderer.element as HTMLElement
            el.classList.add('floating')
            document.body.appendChild(el)
            place(el, props.clientRect)
          },
          onUpdate: (props) => {
            renderer?.updateProps(props)
            if (renderer) place(renderer.element as HTMLElement, props.clientRect)
          },
          onKeyDown: ({ event }) => {
            if (event.key === 'Escape') {
              renderer?.destroy()
              renderer?.element.remove()
              renderer = null
              return true
            }
            return renderer?.ref?.onKeyDown(event) ?? false
          },
          onExit: () => {
            renderer?.element.remove()
            renderer?.destroy()
            renderer = null
          }
        }
      }
    }
    return [Suggestion({ editor: this.editor, ...options })]
  }
})
