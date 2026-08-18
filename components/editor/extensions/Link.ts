import BaseLink from '@tiptap/extension-link'
import { mergeAttributes } from '@tiptap/core'

export const Link = BaseLink.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class:
          'text-blue-600 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-600 cursor-pointer',
      }),
      0,
    ]
  },
}).configure({
  openOnClick: false,
  autolink: true,
  HTMLAttributes: {
    rel: 'noopener noreferrer nofollow',
    target: '_blank',
  },
})
