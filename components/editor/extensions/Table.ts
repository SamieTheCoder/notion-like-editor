import { mergeAttributes } from '@tiptap/core'
import {
  Table as BaseTable,
  TableRow as BaseTableRow,
  TableHeader as BaseTableHeader,
  TableCell as BaseTableCell,
} from '@tiptap/extension-table'

export type TableDensity = 'none' | 'compact' | 'normal' | 'relaxed'

export const TABLE_DENSITIES: TableDensity[] = ['none', 'compact', 'normal', 'relaxed']

/**
 * Cell padding and line height per density step. Every class here needs an
 * entry in `lib/render-html.ts` or it will vanish from the email output.
 */
const DENSITY_CLASS: Record<TableDensity, string> = {
  none: 'px-2 py-0',
  compact: 'px-2 py-1 leading-5',
  normal: 'px-3 py-2 leading-7',
  relaxed: 'px-4 py-3 leading-8',
}

/**
 * Border and density live on the cells as well as the table.
 *
 * A cell cannot read its table's attributes while rendering, and the email
 * renderer inlines styles per element — a table-level `[&_td]:border-0` would
 * be dropped, because the class-to-style converter deliberately skips arbitrary
 * variants. Mirroring both settings onto every cell is what keeps the editor,
 * the Tailwind output and the email output in agreement.
 */
const sharedAttributes = {
  borders: {
    default: true,
    parseHTML: (element: HTMLElement) => element.getAttribute('data-borders') !== 'false',
    renderHTML: (attributes: Record<string, unknown>) => ({
      'data-borders': attributes.borders ? 'true' : 'false',
    }),
  },
  density: {
    default: 'none' as TableDensity,
    parseHTML: (element: HTMLElement) =>
      (element.getAttribute('data-density') as TableDensity) || 'none',
    renderHTML: (attributes: Record<string, unknown>) => ({
      'data-density': attributes.density,
    }),
  },
}

const densityOf = (attrs: Record<string, unknown>): TableDensity => {
  const d = attrs.density as TableDensity
  return TABLE_DENSITIES.includes(d) ? d : 'none'
}

const hasBorders = (attrs: Record<string, unknown>): boolean => attrs.borders !== false

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableStyle: {
      setTableBorders: (borders: boolean) => ReturnType
      toggleTableBorders: () => ReturnType
      setTableDensity: (density: TableDensity) => ReturnType
      increaseTableDensity: () => ReturnType
      decreaseTableDensity: () => ReturnType
    }
  }
}

export const Table = BaseTable.extend({
  addAttributes() {
    return { ...this.parent?.(), ...sharedAttributes }
  },

  addCommands() {
    /**
     * Applies attributes to the enclosing table and every row and cell inside
     * it in one transaction, so the whole table changes together and a single
     * undo reverts it.
     */
    const applyToTable =
      (attrs: Record<string, unknown>) =>
      ({ state, dispatch }: { state: import('@tiptap/pm/state').EditorState; dispatch?: (tr: import('@tiptap/pm/state').Transaction) => void }) => {
        const { $from } = state.selection

        let depth = $from.depth
        while (depth > 0 && $from.node(depth).type.name !== 'table') depth -= 1
        if (depth === 0 || $from.node(depth).type.name !== 'table') return false

        if (!dispatch) return true

        const tableNode = $from.node(depth)
        const tablePos = $from.before(depth)
        const tr = state.tr

        // setNodeMarkup never changes document size, so positions captured from
        // the original node stay valid for the whole walk.
        tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, ...attrs })

        tableNode.descendants((node, pos) => {
          const name = node.type.name
          if (name === 'tableCell' || name === 'tableHeader' || name === 'tableRow') {
            tr.setNodeMarkup(tablePos + 1 + pos, undefined, { ...node.attrs, ...attrs })
          }
          return true
        })

        dispatch(tr)
        return true
      }

    /** Reads the current table's density, for the relative step commands. */
    const currentDensity = (state: import('@tiptap/pm/state').EditorState): TableDensity | null => {
      const { $from } = state.selection
      let depth = $from.depth
      while (depth > 0 && $from.node(depth).type.name !== 'table') depth -= 1
      if (depth === 0 || $from.node(depth).type.name !== 'table') return null
      return densityOf($from.node(depth).attrs)
    }

    const step = (direction: 1 | -1) => () => (props: Parameters<ReturnType<typeof applyToTable>>[0]) => {
      const current = currentDensity(props.state)
      if (!current) return false
      const index = TABLE_DENSITIES.indexOf(current)
      const next = TABLE_DENSITIES[index + direction]
      if (!next) return false
      return applyToTable({ density: next })(props)
    }

    return {
      ...this.parent?.(),
      setTableBorders: (borders: boolean) => applyToTable({ borders }),
      toggleTableBorders:
        () =>
        (props: Parameters<ReturnType<typeof applyToTable>>[0]) => {
          const { $from } = props.state.selection
          let depth = $from.depth
          while (depth > 0 && $from.node(depth).type.name !== 'table') depth -= 1
          if (depth === 0 || $from.node(depth).type.name !== 'table') return false
          const next = !hasBorders($from.node(depth).attrs)
          return applyToTable({ borders: next })(props)
        },
      setTableDensity: (density: TableDensity) => applyToTable({ density }),
      increaseTableDensity: step(1),
      decreaseTableDensity: step(-1),
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const borders = hasBorders(node.attrs)
    return [
      'div',
      { class: 'my-4 overflow-x-auto' },
      [
        'table',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: `w-full border-collapse text-sm${
            borders ? ' border border-gray-300' : ''
          }`,
        }),
        ['tbody', 0],
      ],
    ]
  },
}).configure({ resizable: true })

export const TableRow = BaseTableRow.extend({
  addAttributes() {
    return { ...this.parent?.(), ...sharedAttributes }
  },

  renderHTML({ node, HTMLAttributes }) {
    const borders = hasBorders(node.attrs)
    return [
      'tr',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...(borders ? { class: 'border-b border-gray-200' } : {}),
      }),
      0,
    ]
  },
})

export const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...sharedAttributes }
  },

  renderHTML({ node, HTMLAttributes }) {
    const borders = hasBorders(node.attrs)
    return [
      'th',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: [
          borders ? 'border border-gray-300' : '',
          'bg-gray-50',
          DENSITY_CLASS[densityOf(node.attrs)],
          'text-left font-semibold text-gray-900',
        ]
          .filter(Boolean)
          .join(' '),
      }),
      0,
    ]
  },
})

export const TableCell = BaseTableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...sharedAttributes }
  },

  renderHTML({ node, HTMLAttributes }) {
    const borders = hasBorders(node.attrs)
    return [
      'td',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: [
          borders ? 'border border-gray-300' : '',
          DENSITY_CLASS[densityOf(node.attrs)],
          'align-top',
        ]
          .filter(Boolean)
          .join(' '),
      }),
      0,
    ]
  },
})
