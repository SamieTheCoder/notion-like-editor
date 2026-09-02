import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ButtonNodeView } from './ButtonNodeView'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'small' | 'default' | 'large'
export type ButtonAlign = 'left' | 'center' | 'right'

export interface ButtonAttrs {
  label: string
  href: string
  variant: ButtonVariant
  size: ButtonSize
  align: ButtonAlign
  /** Custom background, overrides the variant's. Empty = use the variant. */
  bgColor: string
  /** Custom text colour, overrides the variant's. Empty = use the variant. */
  textColor: string
}

/**
 * Variant colours split by role so a custom colour can replace one part
 * without dropping the others. Every class must have an entry in
 * `lib/render-html.ts` or it will vanish from the email output.
 */
const VARIANT_PARTS: Record<
  ButtonVariant,
  { bg?: string; text?: string; border?: string }
> = {
  primary: { bg: 'bg-blue-600', text: 'text-white' },
  secondary: { bg: 'bg-gray-900', text: 'text-white' },
  outline: { text: 'text-blue-600', border: 'border border-blue-600' },
  ghost: { text: 'text-blue-600' },
}

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  small: 'px-3 py-1.5 text-sm',
  default: 'px-5 py-2.5 text-sm',
  large: 'px-6 py-3 text-base',
}

export const BUTTON_ALIGN_CLASS: Record<ButtonAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/** Swatches offered in the picker. */
export const BUTTON_BG_SWATCHES = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Slate', value: '#334155' },
  { name: 'Black', value: '#111827' },
  { name: 'White', value: '#ffffff' },
]

export const BUTTON_TEXT_SWATCHES = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#111827' },
  { name: 'Slate', value: '#475569' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Red', value: '#dc2626' },
]

/**
 * Only http(s), mailto and tel links reach the rendered output. Anything else
 * (notably `javascript:`) is dropped so a document cannot smuggle script into
 * an exported email.
 */
export function sanitizeHref(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  if (value === '') return ''
  // Merge-field tokens (#TOKEN#) resolve to a real URL at send time, so allow
  // any href that contains a token — either a bare token, or a token embedded
  // in a URL like https://app.example.com/r/#REGISTRATION_NO#.
  if (/#[A-Z0-9_]+#/i.test(value)) return value
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value
  if (/^(\/\/|\/|#)/.test(value)) return value
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value)) return `https://${value}`
  return ''
}

/**
 * Custom colours are written into a `style` attribute, so anything that could
 * terminate a declaration and inject further CSS has to be rejected. Only hex
 * and rgb()/rgba() forms are allowed through.
 */
export function sanitizeColor(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  if (value === '') return ''
  if (/^#[0-9a-f]{3}$/i.test(value)) return value
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{8}$/i.test(value)) return value
  if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i.test(value)) {
    return value
  }
  return ''
}

type ButtonStyleInput = {
  variant: ButtonVariant
  size: ButtonSize
  bgColor?: string
  textColor?: string
}

/**
 * The button's Tailwind classes. A variant colour is omitted whenever a custom
 * colour replaces it, because the email renderer appends class-derived styles
 * *after* the inline `style` attribute — leaving both in would let the class
 * win and silently discard the author's colour.
 */
export function buildButtonClass({
  variant,
  size,
  bgColor,
  textColor,
}: ButtonStyleInput): string {
  const parts = VARIANT_PARTS[variant] ?? VARIANT_PARTS.primary
  const bg = sanitizeColor(bgColor)
  const text = sanitizeColor(textColor)

  const classes = [
    'inline-block no-underline rounded-md font-semibold',
    BUTTON_SIZE_CLASS[size] ?? BUTTON_SIZE_CLASS.default,
  ]

  if (!bg && parts.bg) classes.push(parts.bg)
  if (!text && parts.text) classes.push(parts.text)
  // A custom text colour also drives the border, so drop the border colour
  // class and let the inline style set both.
  if (parts.border) classes.push(text ? 'border' : parts.border)

  return classes.join(' ')
}

/** Inline style carrying the author's custom colours, if any. */
export function buildButtonStyle({
  variant,
  bgColor,
  textColor,
}: ButtonStyleInput): string {
  const parts = VARIANT_PARTS[variant] ?? VARIANT_PARTS.primary
  const bg = sanitizeColor(bgColor)
  const text = sanitizeColor(textColor)

  const decls: string[] = []
  if (bg) decls.push(`background-color:${bg}`)
  if (text) decls.push(`color:${text}`)
  if (text && parts.border) decls.push(`border-color:${text}`)

  return decls.length ? `${decls.join(';')};` : ''
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    buttonBlock: {
      setButtonBlock: (attrs?: Partial<ButtonAttrs>) => ReturnType
      updateButtonBlock: (attrs: Partial<ButtonAttrs>) => ReturnType
    }
  }
}

export const ButtonNode = Node.create({
  name: 'buttonBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      label: {
        default: 'Click here',
        parseHTML: (element) =>
          element.getAttribute('data-label') || element.textContent || 'Click here',
        renderHTML: (attributes) => ({ 'data-label': attributes.label }),
      },
      href: {
        default: '',
        parseHTML: (element) => element.getAttribute('href') || '',
        renderHTML: () => ({}), // written explicitly in renderHTML below
      },
      variant: {
        default: 'primary' as ButtonVariant,
        parseHTML: (element) =>
          (element.getAttribute('data-variant') as ButtonVariant) || 'primary',
        renderHTML: (attributes) => ({ 'data-variant': attributes.variant }),
      },
      size: {
        default: 'default' as ButtonSize,
        parseHTML: (element) =>
          (element.getAttribute('data-size') as ButtonSize) || 'default',
        renderHTML: (attributes) => ({ 'data-size': attributes.size }),
      },
      align: {
        default: 'left' as ButtonAlign,
        parseHTML: (element) =>
          (element.getAttribute('data-align') as ButtonAlign) || 'left',
        renderHTML: (attributes) => ({ 'data-align': attributes.align }),
      },
      bgColor: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-bg-color') || '',
        renderHTML: (attributes) =>
          attributes.bgColor ? { 'data-bg-color': attributes.bgColor } : {},
      },
      textColor: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-text-color') || '',
        renderHTML: (attributes) =>
          attributes.textColor ? { 'data-text-color': attributes.textColor } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-type="buttonBlock"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = (node.attrs.variant || 'primary') as ButtonVariant
    const size = (node.attrs.size || 'default') as ButtonSize
    const align = (node.attrs.align || 'left') as ButtonAlign
    const label = String(node.attrs.label ?? '')
    const href = sanitizeHref(node.attrs.href)
    const input = {
      variant,
      size,
      bgColor: node.attrs.bgColor as string,
      textColor: node.attrs.textColor as string,
    }

    const style = buildButtonStyle(input)

    return [
      'div',
      { class: `my-4 ${BUTTON_ALIGN_CLASS[align] ?? BUTTON_ALIGN_CLASS.left}` },
      [
        'a',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': 'buttonBlock',
          class: buildButtonClass(input),
          ...(style ? { style } : {}),
          // An empty href leaves the anchor unclickable but still rendered,
          // which is the correct signal that no link has been set yet.
          ...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {}),
        }),
        label,
      ],
    ]
  },

  addCommands() {
    return {
      setButtonBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              label: 'Click here',
              href: '',
              variant: 'primary',
              size: 'default',
              align: 'left',
              bgColor: '',
              textColor: '',
              ...attrs,
            },
          }),
      updateButtonBlock:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonNodeView)
  },
})
