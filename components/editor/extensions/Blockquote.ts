import BaseBlockquote from '@tiptap/extension-blockquote'
import { mergeAttributes } from '@tiptap/core'

export const Blockquote = BaseBlockquote.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'blockquote',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'border-l-4 border-gray-600 pl-4 my-4',
      }),
      0,
    ]
  },
})
