import BaseCode from '@tiptap/extension-code'
import { mergeAttributes } from '@tiptap/core'

export const Code = BaseCode.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'code',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono',
      }),
      0,
    ]
  },
})
