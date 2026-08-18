import BaseHighlight from '@tiptap/extension-highlight'
import { mergeAttributes } from '@tiptap/core'

export const Highlight = BaseHighlight.extend({
  renderHTML({ HTMLAttributes }) {
    const { color, ...rest } = HTMLAttributes
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, rest, {
        class: 'rounded px-0.5 py-px',
        ...(color ? { style: `background-color: ${color}` } : { class: 'bg-yellow-200 rounded px-0.5 py-px' }),
      }),
      0,
    ]
  },
}).configure({ multicolor: true })
