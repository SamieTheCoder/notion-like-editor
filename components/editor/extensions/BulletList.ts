import { mergeAttributes } from '@tiptap/core'
import { BulletList as BaseBulletList } from '@tiptap/extension-list'

export const BulletList = BaseBulletList.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'ul',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'list-disc list-outside pl-6 mb-4 space-y-1',
      }),
      0,
    ]
  },
})
