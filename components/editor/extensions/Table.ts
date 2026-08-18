import { mergeAttributes } from '@tiptap/core'
import {
  Table as BaseTable,
  TableRow as BaseTableRow,
  TableHeader as BaseTableHeader,
  TableCell as BaseTableCell,
} from '@tiptap/extension-table'

export const Table = BaseTable.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'my-4 overflow-x-auto' },
      [
        'table',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: 'w-full border-collapse border border-gray-300 text-sm',
        }),
        ['tbody', 0],
      ],
    ]
  },
}).configure({ resizable: true })

export const TableRow = BaseTableRow.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'tr',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'border-b border-gray-200',
      }),
      0,
    ]
  },
})

export const TableHeader = BaseTableHeader.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'th',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class:
          'border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900',
      }),
      0,
    ]
  },
})

export const TableCell = BaseTableCell.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'td',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'border border-gray-300 px-3 py-2 align-top',
      }),
      0,
    ]
  },
})
