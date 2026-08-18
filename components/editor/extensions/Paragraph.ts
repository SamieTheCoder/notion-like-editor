import BaseParagraph from '@tiptap/extension-paragraph'
import { mergeAttributes } from '@tiptap/core'

export const Paragraph = BaseParagraph.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'text-base leading-7 mb-2',
      }),
      0,
    ]
  },
})
