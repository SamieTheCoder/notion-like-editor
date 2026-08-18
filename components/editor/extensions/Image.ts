import BaseImage from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export const Image = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({ 'data-align': attributes.align }),
      },
    }
  },
  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-align'] || 'center'
    const wrapperClass = {
      left: 'flex justify-start my-4',
      center: 'flex justify-center my-4',
      right: 'flex justify-end my-4',
    }[align as 'left' | 'center' | 'right']

    return [
      'figure',
      { class: wrapperClass },
      [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: 'rounded-lg max-w-full h-auto shadow-sm',
        }),
      ],
    ]
  },
}).configure({ allowBase64: true, inline: false })
