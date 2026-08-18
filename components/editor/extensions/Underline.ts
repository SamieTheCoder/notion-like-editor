import BaseUnderline from '@tiptap/extension-underline'
import { mergeAttributes } from '@tiptap/core'

export const Underline = BaseUnderline.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'u',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'underline underline-offset-2',
      }),
      0,
    ]
  },
})
