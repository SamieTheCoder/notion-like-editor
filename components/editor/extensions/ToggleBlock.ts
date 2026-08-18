import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType
      unsetToggleBlock: () => ReturnType
      /** Open / close the toggle the selection currently sits in. */
      toggleToggleBlockOpen: (open?: boolean) => ReturnType
    }
  }
}

/* ------------------------------------------------------------------ modes */

/**
 * How `renderHTML` emits presentation.
 *
 * - `tailwind`: utility classes on the tag. This is what the app ships and what
 *   `/api/render` returns, so client and server output stay identical.
 * - `email`: inline `style` attributes with plain CSS, because email clients
 *   strip `<style>` blocks and have no Tailwind build step.
 */
export type ToggleRenderMode = 'tailwind' | 'email'

export interface ToggleBlockOptions {
  HTMLAttributes: Record<string, unknown>
  renderMode: ToggleRenderMode
}

export interface ToggleChildOptions {
  HTMLAttributes: Record<string, unknown>
  renderMode: ToggleRenderMode
}

/**
 * Presentation tokens per node, per mode. Keeping both modes adjacent is
 * deliberate: when one changes, the other is visible in the same diff.
 *
 * Email values avoid flexbox, custom properties, and `gap`. Outlook (Word
 * rendering engine) supports none of them.
 */
const STYLES = {
  block: {
    tailwind: 'group my-2 rounded-md border border-gray-200 px-3 py-2',
    email:
      'margin:8px 0;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;',
  },
  summary: {
    tailwind:
      'cursor-pointer font-medium text-gray-900 marker:text-gray-400 outline-none',
    email: 'margin:0;font-weight:600;color:#111827;',
  },
  content: {
    tailwind: 'mt-2 pl-4 border-l border-gray-200 [&>p:last-child]:mb-0',
    email: 'margin:8px 0 0 0;padding-left:16px;border-left:1px solid #e5e7eb;',
  },
} as const

type StyleKey = keyof typeof STYLES

/**
 * Returns the attribute that carries presentation for the active mode:
 * `class` for Tailwind, `style` for email.
 */
function presentation(
  key: StyleKey,
  mode: ToggleRenderMode
): Record<string, string> {
  return mode === 'email'
    ? { style: STYLES[key].email }
    : { class: STYLES[key].tailwind }
}

/* ------------------------------------------------------------- node helpers */

/** Depth-safe lookup of the toggleBlock wrapping the current selection. */
function findToggleBlock(state: {
  selection: { $from: { depth: number; before: (d: number) => number; node: (d: number) => { type: { name: string } } } }
}) {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'toggleBlock') {
      return { pos: $from.before(depth), depth }
    }
  }
  return null
}

/* ---------------------------------------------------------------- the node */

/**
 * Notion-style collapsible toggle.
 *
 * In the editor a nodeView renders a `div` plus a chevron button, because
 * native `<details>` fights ProseMirror over the `open` attribute and swallows
 * clicks on the summary. Exported HTML uses real `<details>`/`<summary>` so it
 * stays interactive with no JavaScript.
 */
export const ToggleBlock = Node.create<ToggleBlockOptions>({
  name: 'toggleBlock',
  group: 'block',
  content: 'toggleSummary toggleContent',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {}, renderMode: 'tailwind' }
  },

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute('open'),
        // `open` is only meaningful on <details>. Email mode renders a plain
        // div that is always expanded, so emitting it there would produce an
        // invalid attribute.
        renderHTML: (attributes) => {
          if (this.options.renderMode === 'email') return {}
          return attributes.open ? { open: 'open' } : {}
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'details[data-type="toggleBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const mode = this.options.renderMode

    // Email clients do not support <details>. Render an always-expanded block
    // instead: a collapsed toggle in an inbox is just missing content.
    const tag = mode === 'email' ? 'div' : 'details'

    return [
      tag,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'toggleBlock',
        ...presentation('block', mode),
      }),
      0,
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('div')
      wrapper.dataset.type = 'toggleBlock'
      wrapper.className = 'toggle-block ' + STYLES.block.tailwind
      // Drives content visibility through CSS instead of a DOM query, so it
      // cannot race ProseMirror rendering its children.
      wrapper.dataset.open = String(Boolean(node.attrs.open))

      const row = document.createElement('div')
      row.className = 'toggle-block-row'
      wrapper.appendChild(row)

      /* --- chevron ------------------------------------------------------- */

      const chevronCell = document.createElement('div')
      chevronCell.contentEditable = 'false'
      chevronCell.className = 'toggle-block-chevron'
      row.appendChild(chevronCell)

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'toggle-block-button'
      button.setAttribute('aria-label', 'Toggle')
      button.setAttribute('aria-expanded', String(Boolean(node.attrs.open)))
      // ChevronRight, matching lucide-react's path so the icon set stays
      // visually consistent. A nodeView cannot render a React component.
      button.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" ' +
        'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
      chevronCell.appendChild(button)

      const resolvePos = () => {
        if (typeof getPos !== 'function') return null
        const pos = getPos()
        return typeof pos === 'number' ? pos : null
      }

      // mousedown only guards the selection; the actual toggle lives on click
      // so keyboard activation (Enter / Space on a focused button) still works.
      button.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
      })

      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()

        const pos = resolvePos()
        if (pos === null) return

        const current = editor.state.doc.nodeAt(pos)
        if (!current || current.type.name !== 'toggleBlock') return

        const nextOpen = !current.attrs.open

        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...current.attrs,
              open: nextOpen,
            })

            // Collapsing with the caret inside the hidden body would strand it
            // in invisible content. Pull it up to the summary first.
            if (!nextOpen) {
              const summaryStart = pos + 1
              const summaryEnd = summaryStart + current.child(0).nodeSize
              const { from } = tr.selection
              if (from >= summaryEnd && from <= pos + current.nodeSize) {
                const inSummary = TextSelection.findFrom(
                  tr.doc.resolve(summaryStart),
                  1,
                  true
                )
                if (inSummary) tr.setSelection(inSummary)
              }
            }

            return true
          })
          .run()
      })

      /* --- content ------------------------------------------------------- */

      // Single contentDOM holding both children (toggleSummary, toggleContent).
      // The summary sits beside the chevron; the body is hidden via the
      // `data-open` attribute on the wrapper.
      const contentDOM = document.createElement('div')
      contentDOM.className = 'toggle-block-content'
      row.appendChild(contentDOM)

      return {
        dom: wrapper,
        contentDOM,

        ignoreMutation: (mutation) => {
          // Our own attribute bookkeeping, not user input.
          if (
            mutation.type === 'attributes' &&
            mutation.target === wrapper &&
            (mutation.attributeName === 'data-open' ||
              mutation.attributeName === 'class')
          ) {
            return true
          }
          // The chevron is contentEditable=false and outside the document.
          return chevronCell.contains(mutation.target as globalThis.Node)
        },

        update: (updatedNode) => {
          if (updatedNode.type.name !== 'toggleBlock') return false
          const open = Boolean(updatedNode.attrs.open)
          wrapper.dataset.open = String(open)
          button.setAttribute('aria-expanded', String(open))
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
                { type: 'toggleContent', content: [{ type: 'paragraph' }] },
              ],
            })
            // Land the caret in the summary so the user can type the title
            // immediately, the way Notion behaves.
            .command(({ tr, dispatch }) => {
              if (!dispatch) return true
              const found = TextSelection.findFrom(
                tr.doc.resolve(Math.max(0, tr.selection.from - 2)),
                -1,
                true
              )
              if (found) tr.setSelection(found)
              return true
            })
            .run(),

      unsetToggleBlock:
        () =>
        ({ commands }) =>
          commands.lift(this.name),

      toggleToggleBlockOpen:
        (open) =>
        ({ state, chain }) => {
          const target = findToggleBlock(state)
          if (!target) return false

          const node = state.doc.nodeAt(target.pos)
          if (!node) return false

          return chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(target.pos, undefined, {
                ...node.attrs,
                open: open ?? !node.attrs.open,
              })
              return true
            })
            .run()
        },
    }
  },
})

/* -------------------------------------------------------------- the summary */

/**
 * Editable title line. Plain `inline*` content, so it behaves like any other
 * text block: marks, selection, and input rules all work inside it.
 */
export const ToggleSummary = Node.create<ToggleChildOptions>({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,
  selectable: false,

  addOptions() {
    return { HTMLAttributes: {}, renderMode: 'tailwind' }
  },

  parseHTML() {
    return [{ tag: 'summary' }]
  },

  renderHTML({ HTMLAttributes }) {
    const mode = this.options.renderMode

    // `<summary>` is only meaningful inside `<details>`; in email mode the
    // wrapper is a plain div, so the title becomes a paragraph.
    const tag = mode === 'email' ? 'p' : 'summary'

    return [
      tag,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...presentation('summary', mode),
      }),
      0,
    ]
  },

  addKeyboardShortcuts() {
    return {
      /**
       * Enter moves from the title into the body, opening the toggle if it was
       * closed. Splitting the summary into a second summary is not valid under
       * the schema, so the default handler would just be a no-op.
       */
      Enter: () => {
        const { state } = this.editor
        const { $from } = state.selection

        if ($from.parent.type.name !== 'toggleSummary') return false

        const togglePos = $from.before($from.depth - 1)
        const toggleNode = state.doc.nodeAt(togglePos)
        if (!toggleNode || toggleNode.type.name !== 'toggleBlock') return false

        // Start of toggleContent: after the wrapper's open token and the
        // whole summary node.
        const bodyStart = togglePos + 1 + toggleNode.child(0).nodeSize

        this.editor
          .chain()
          .command(({ tr }) => {
            if (!toggleNode.attrs.open) {
              tr.setNodeMarkup(togglePos, undefined, {
                ...toggleNode.attrs,
                open: true,
              })
            }

            const target = TextSelection.findFrom(
              tr.doc.resolve(Math.min(bodyStart, tr.doc.content.size)),
              1,
              true
            )
            if (target) tr.setSelection(target)
            return true
          })
          .scrollIntoView()
          .run()

        return true
      },

      /**
       * Backspace at the start of the title, in three stages:
       *   empty title            -> remove the toggle, leave a paragraph
       *   title + toggle open    -> collapse it
       *   title + toggle closed  -> unwrap to a paragraph, keeping the text
       */
      Backspace: () => {
        const { state } = this.editor
        const { $from, empty } = state.selection

        if (!empty) return false
        if ($from.parent.type.name !== 'toggleSummary') return false
        if ($from.parentOffset !== 0) return false

        const togglePos = $from.before($from.depth - 1)
        const toggleNode = state.doc.nodeAt(togglePos)
        if (!toggleNode || toggleNode.type.name !== 'toggleBlock') return false

        const summary = $from.parent
        const paragraphType = state.schema.nodes.paragraph

        // 1. Empty title: drop the whole toggle, including its body.
        if (summary.content.size === 0) {
          return this.editor
            .chain()
            .command(({ tr }) => {
              tr.replaceWith(
                togglePos,
                togglePos + toggleNode.nodeSize,
                paragraphType.create()
              )
              const caret = TextSelection.findFrom(
                tr.doc.resolve(Math.min(togglePos + 1, tr.doc.content.size)),
                1,
                true
              )
              if (caret) tr.setSelection(caret)
              return true
            })
            .run()
        }

        // 2. Open with a title: collapse rather than destroy content.
        if (toggleNode.attrs.open) {
          return this.editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(togglePos, undefined, {
                ...toggleNode.attrs,
                open: false,
              })
              return true
            })
            .run()
        }

        // 3. Already closed: unwrap. Title becomes a paragraph, body follows
        //    it as sibling blocks so nothing is silently lost.
        return this.editor
          .chain()
          .command(({ tr }) => {
            const body = toggleNode.child(1)
            const replacement = [paragraphType.create(null, summary.content)]

            body.forEach((child) => {
              replacement.push(child)
            })

            tr.replaceWith(
              togglePos,
              togglePos + toggleNode.nodeSize,
              replacement
            )

            const caret = TextSelection.findFrom(
              tr.doc.resolve(Math.min(togglePos + 1, tr.doc.content.size)),
              1,
              true
            )
            if (caret) tr.setSelection(caret)
            return true
          })
          .run()
      },
    }
  },
})

/* -------------------------------------------------------------- the content */

export const ToggleContent = Node.create<ToggleChildOptions>({
  name: 'toggleContent',
  content: 'block+',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {}, renderMode: 'tailwind' }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggleContent"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const mode = this.options.renderMode

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'toggleContent',
        ...presentation('content', mode),
      }),
      0,
    ]
  },
})

/* ---------------------------------------------------------------- variants */

/**
 * Pre-configured trio for inline-CSS output, for email or any other consumer
 * that cannot run Tailwind.
 *
 * ```ts
 * import { generateHTML } from '@tiptap/html/server'
 * import { toggleBlockEmail } from '@/components/editor/extensions/ToggleBlock'
 *
 * generateHTML(json, [...otherExtensions, ...toggleBlockEmail()])
 * ```
 *
 * Note: email output drops `<details>`/`<summary>` for `div`/`p`, so it is a
 * one-way export. Do not feed it back into `parseHTML`.
 */
export function toggleBlockEmail() {
  return [
    ToggleBlock.configure({ renderMode: 'email' }),
    ToggleSummary.configure({ renderMode: 'email' }),
    ToggleContent.configure({ renderMode: 'email' }),
  ]
}

/** Explicit counterpart to `toggleBlockEmail`, matching the shipped default. */
export function toggleBlockTailwind() {
  return [
    ToggleBlock.configure({ renderMode: 'tailwind' }),
    ToggleSummary.configure({ renderMode: 'tailwind' }),
    ToggleContent.configure({ renderMode: 'tailwind' }),
  ]
}
