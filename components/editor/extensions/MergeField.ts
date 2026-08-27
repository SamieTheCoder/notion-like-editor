import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeField: {
      insertMergeField: (token: string) => ReturnType
    }
  }
}

/**
 * An inline merge-field token — `#LEAD_NAME#` etc.
 *
 * In the editor it renders as a highlighted chip so tokens are visually distinct
 * from typed text. In the HTML output it becomes the raw `#TOKEN#` string — which
 * is exactly what the Java backend expects for template interpolation.
 *
 * Atom + inline means it behaves like an emoji: one unit, selectable, deletable
 * with backspace, but not editable character by character.
 */
export const MergeField = Node.create({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      token: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-token') || '',
        renderHTML: (attributes) => ({ 'data-token': attributes.token }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mergeField"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const token = String(node.attrs.token ?? '')
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mergeField',
        class: 'merge-field',
      }),
      `#${token}#`,
    ]
  },

  addCommands() {
    return {
      insertMergeField:
        (token) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { token },
          }),
    }
  },
})
