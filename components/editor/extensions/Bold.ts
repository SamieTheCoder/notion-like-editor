import BaseBold from '@tiptap/extension-bold'
import { mergeAttributes } from '@tiptap/core'

export const Bold = BaseBold.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'strong',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'font-bold',
      }),
      0,
    ]
  },
})
