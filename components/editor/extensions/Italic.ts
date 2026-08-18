import BaseItalic from '@tiptap/extension-italic'
import { mergeAttributes } from '@tiptap/core'

export const Italic = BaseItalic.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'em',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'italic',
      }),
      0,
    ]
  },
})
