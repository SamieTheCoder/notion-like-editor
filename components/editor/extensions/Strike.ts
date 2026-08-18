import BaseStrike from '@tiptap/extension-strike'
import { mergeAttributes } from '@tiptap/core'

export const Strike = BaseStrike.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      's',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'line-through',
      }),
      0,
    ]
  },
})
