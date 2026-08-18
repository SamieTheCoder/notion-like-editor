import { mergeAttributes } from '@tiptap/core'
import { ListItem as BaseListItem } from '@tiptap/extension-list'

export const ListItem = BaseListItem.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'leading-7',
      }),
      0,
    ]
  },
})
