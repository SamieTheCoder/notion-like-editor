import BaseImage from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageResize: {
      setImageAlign: (align: 'left' | 'center' | 'right') => ReturnType
      setImageWidth: (width: number | null) => ReturnType
    }
  }
}

export const Image = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute('width') || element.style.width
          return w ? parseInt(w, 10) || null : null
        },
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

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),
      setImageWidth:
        (width) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { width }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-align'] || 'center'
    const width = HTMLAttributes.width

    const wrapperStyle: Record<string, string> = {}
    const wrapperClass = {
      left: 'flex justify-start my-4',
      center: 'flex justify-center my-4',
      right: 'flex justify-end my-4',
    }[align as 'left' | 'center' | 'right']

    const imgStyle = width ? `width: ${width}px; max-width: 100%; height: auto;` : ''

    return [
      'figure',
      { class: wrapperClass, ...wrapperStyle },
      [
        'img',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: 'rounded-lg max-w-full h-auto shadow-sm',
          ...(imgStyle ? { style: imgStyle } : {}),
        }),
      ],
    ]
  },
}).configure({ allowBase64: true, inline: false })
