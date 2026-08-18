import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType
      unsetToggleBlock: () => ReturnType
    }
  }
}

/**
 * Notion-style collapsible toggle. Renders to native <details>/<summary>
 * so the exported HTML stays interactive without any JavaScript.
 */
export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'toggleSummary toggleContent',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => (attributes.open ? { open: 'open' } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'details[data-type="toggleBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'toggleBlock',
        class: 'group my-2 rounded-md border border-gray-200 px-3 py-2',
      }),
      0,
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const details = document.createElement('details')
      details.classList.add('group', 'my-2', 'rounded-md', 'border', 'border-gray-200', 'px-3', 'py-2')
      details.dataset.type = 'toggleBlock'
      if (node.attrs.open) details.open = true

      // Content wrapper - MUST be appended to details for ProseMirror to
      // render child nodes (toggleSummary + toggleContent) inside it.
      const contentWrapper = document.createElement('div')
      details.appendChild(contentWrapper)

      // Toggle open/close when clicking on the triangle area (left 24px of summary).
      // We use mousedown to prevent ProseMirror from swallowing the event.
      details.addEventListener('mousedown', (e) => {
        const summary = details.querySelector('summary')
        if (!summary) return
        const target = e.target as HTMLElement
        if (target !== summary && !summary.contains(target)) return

        const summaryRect = summary.getBoundingClientRect()
        const isOnTriangle = e.clientX < summaryRect.left + 24
        if (!isOnTriangle) return

        e.preventDefault()
        e.stopPropagation()

        if (typeof getPos === 'function') {
          const pos = getPos()
          if (typeof pos !== 'number') return
          editor.chain().command(({ tr }) => {
            const currentNode = tr.doc.nodeAt(pos)
            if (!currentNode) return false
            tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              open: !details.open,
            })
            return true
          }).run()
        }
      })

      // Prevent the native toggle event from fighting ProseMirror
      details.addEventListener('toggle', () => {
        // Sync back to the current attr state
        if (typeof getPos === 'function') {
          const pos = getPos()
          if (typeof pos !== 'number') return
          const currentNode = editor.state.doc.nodeAt(pos)
          if (currentNode) {
            details.open = currentNode.attrs.open
          }
        }
      })

      return {
        dom: details,
        contentDOM: contentWrapper,
        ignoreMutation: (mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
            return true
          }
          return false
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'toggleBlock') return false
          details.open = updatedNode.attrs.open
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setToggleBlock:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                { type: 'toggleSummary' },
                {
                  type: 'toggleContent',
                  content: [{ type: 'paragraph' }],
                },
              ],
            })
            .run(),
      unsetToggleBlock:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection

        if ($from.parent.type.name !== 'toggleSummary') return false
        if ($from.parentOffset !== 0) return false
        if ($from.parent.content.size !== 0) return false

        const togglePos = $from.before($from.depth - 1)
        const toggleNode = state.doc.nodeAt(togglePos)
        if (!toggleNode || toggleNode.type.name !== 'toggleBlock') return false

        this.editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.delete(togglePos, togglePos + toggleNode.nodeSize)
              tr.insert(togglePos, state.schema.nodes.paragraph.create())
            }
            return true
          })
          .run()

        return true
      },
    }
  },
})

export const ToggleSummary = Node.create({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,
  selectable: false,

  parseHTML() {
    return [{ tag: 'summary' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'summary',
      mergeAttributes(HTMLAttributes, {
        class:
          'cursor-pointer font-medium text-gray-900 marker:text-gray-400 outline-none',
      }),
      0,
    ]
  },
})

export const ToggleContent = Node.create({
  name: 'toggleContent',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toggleContent"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggleContent',
        class: 'mt-2 pl-4 border-l border-gray-200 [&>p:last-child]:mb-0',
      }),
      0,
    ]
  },
})
