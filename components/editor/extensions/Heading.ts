import BaseHeading from '@tiptap/extension-heading'
import { mergeAttributes } from '@tiptap/core'

const HEADING_CLASSES: Record<number, string> = {
  1: 'text-4xl font-bold tracking-tight mt-8 mb-3',
  2: 'text-3xl font-bold tracking-tight mt-7 mb-3',
  3: 'text-2xl font-semibold mt-6 mb-2',
  4: 'text-xl font-semibold mt-5 mb-2',
  5: 'text-lg font-semibold mt-4 mb-1',
  6: 'text-base font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-1',
}

export const Heading = BaseHeading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as number
    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: HEADING_CLASSES[level] || HEADING_CLASSES[1],
      }),
      0,
    ]
  },
}).configure({ levels: [1, 2, 3, 4, 5, 6] })
