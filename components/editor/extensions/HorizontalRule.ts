import BaseHorizontalRule from '@tiptap/extension-horizontal-rule'
import { mergeAttributes } from '@tiptap/core'

export const HorizontalRule = BaseHorizontalRule.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'hr',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'my-6 border-t border-gray-200',
      }),
    ]
  },
})
