import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import type { VirtualElement } from '@floating-ui/dom'
import { BLOCK_COMMANDS, type BlockCommand } from '@/lib/block-commands'
import {
  SlashMenuList,
  type SlashMenuListRef,
  type SlashMenuListProps,
} from '../SlashMenuList'

/**
 * Slash menu built on Tiptap's official Suggestion plugin.
 *
 * Keyboard handling lives in `render().onKeyDown`, which the plugin calls from
 * ProseMirror's `handleKeyDown` BEFORE any other key handler. Returning `true`
 * marks the event handled so ProseMirror does not also move the caret. That
 * single-owner model is why arrow keys and Enter work reliably here.
 *
 * This replaces `@harshtalks/slash-tiptap`, whose keyboard bridge cannot work:
 * it renders cmdk's `Command.Input` with `display: none` (unfocusable, so cmdk
 * never receives keys) and overrides the Command root's `onKeyDown` with
 * `stopPropagation`.
 */

/** Filters the registry by the text typed after the slash. */
function filterItems(query: string): BlockCommand[] {
  if (!query) return BLOCK_COMMANDS

  const q = query.toLowerCase()
  return BLOCK_COMMANDS.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true
    return item.searchTerms.some((term) => term.toLowerCase().includes(q))
  })
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        // `/` mid-sentence (for example in a URL) should not open the menu.
        allowSpaces: false,
        startOfLine: false,

        items: ({ query }: { query: string }) => filterItems(query),

        command: ({
          editor,
          range,
          props,
        }: {
          editor: Parameters<BlockCommand['run']>[0]
          range: unknown
          props: BlockCommand
        }) => {
          props.run(editor, range)
        },

        render: () => {
          let component: ReactRenderer<SlashMenuListRef, SlashMenuListProps> | null = null
          let wrapper: HTMLDivElement | null = null

          /** Anchors the menu to the caret using floating-ui. */
          const position = (clientRect: (() => DOMRect | null) | null | undefined) => {
            if (!wrapper || !clientRect) return

            const virtual: VirtualElement = {
              getBoundingClientRect: () => clientRect() ?? new DOMRect(),
            }

            void computePosition(virtual, wrapper, {
              placement: 'bottom-start',
              strategy: 'absolute',
              middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
            }).then(({ x, y }) => {
              if (!wrapper) return
              wrapper.style.left = `${x}px`
              wrapper.style.top = `${y}px`
            })
          }

          const teardown = () => {
            component?.destroy()
            wrapper?.remove()
            component = null
            wrapper = null
          }

          return {
            onStart: (props) => {
              // A slash inside a code block is literal text, not a command.
              if (props.editor.isActive('codeBlock')) return

              component = new ReactRenderer(SlashMenuList, {
                editor: props.editor,
                props,
              })

              wrapper = document.createElement('div')
              wrapper.style.position = 'absolute'
              wrapper.style.top = '0'
              wrapper.style.left = '0'
              wrapper.style.zIndex = '50'
              wrapper.appendChild(component.element)
              document.body.appendChild(wrapper)

              position(props.clientRect)
            },

            onUpdate: (props) => {
              component?.updateProps(props)
              position(props.clientRect)
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                teardown()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit: teardown,
          }
        },
      } satisfies Partial<SuggestionOptions>,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
