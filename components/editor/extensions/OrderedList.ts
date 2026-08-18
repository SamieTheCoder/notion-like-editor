import { mergeAttributes } from '@tiptap/core'
import { OrderedList as BaseOrderedList } from '@tiptap/extension-list'

export const OrderedList = BaseOrderedList.extend({
  renderHTML({ HTMLAttributes }) {
    const { start, ...attributesWithoutStart } = HTMLAttributes
    return [
      'ol',
      mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart, {
        class: 'list-decimal list-outside pl-6 mb-4 space-y-1',
        ...(start !== 1 ? { start } : {}),
      }),
      0,
    ]
  },
})
