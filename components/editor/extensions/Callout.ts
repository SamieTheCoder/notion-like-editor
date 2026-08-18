import { Node, mergeAttributes } from '@tiptap/core'

export type CalloutVariant = 'info' | 'warning' | 'success' | 'error' | 'note'

const VARIANTS: Record<CalloutVariant, { wrapper: string }> = {
  info: { wrapper: 'bg-blue-50 text-blue-900' },
  warning: { wrapper: 'bg-amber-50 text-amber-900' },
  success: { wrapper: 'bg-green-50 text-green-900' },
  error: { wrapper: 'bg-red-50 text-red-900' },
  note: { wrapper: 'bg-gray-50 text-gray-900' },
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType
      toggleCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      variant: {
        default: 'info' as CalloutVariant,
        parseHTML: (element) =>
          (element.getAttribute('data-variant') as CalloutVariant) || 'info',
        renderHTML: (attributes) => ({ 'data-variant': attributes.variant }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = (node.attrs.variant || 'info') as CalloutVariant
    const config = VARIANTS[variant] ?? VARIANTS.info

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'callout',
        class: `rounded-lg px-4 py-3 my-4 ${config.wrapper}`,
      }),
      ['div', { class: 'min-w-0 [&>p:last-child]:mb-0' }, 0],
    ]
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => this.editor.commands.toggleCallout(),
    }
  },
})
