/**
 * Single registry of every insertable block. Consumed by the slash menu and
 * the "turn into" dropdown so the two can never drift apart.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ReactNode } from 'react'

export type BlockGroup =
  | 'Basic blocks'
  | 'Lists'
  | 'Media'
  | 'Advanced'

export interface BlockCommand {
  /** Label shown in menus. */
  title: string
  /** Short helper text. */
  description: string
  /** Icon element rendered in the leading badge. */
  icon: ReactNode
  /** Extra words that should match this item when filtering. */
  searchTerms: string[]
  group: BlockGroup
  /** Applies the block. `range` is the `/query` text to delete, when present. */
  run: (editor: any, range?: any) => void
}

/** Deletes the slash query (when invoked from the slash menu) and focuses. */
const base = (editor: any, range?: any) => {
  const chain = editor.chain().focus()
  return range ? chain.deleteRange(range) : chain
}

export const BLOCK_COMMANDS: BlockCommand[] = [
  // ---------------------------------------------------------------- Basic
  {
    title: 'Text',
    description: 'Plain paragraph',
    icon: 'T',
    searchTerms: ['paragraph', 'text', 'plain', 'body'],
    group: 'Basic blocks',
    run: (editor, range) => base(editor, range).setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    searchTerms: ['h1', 'title', 'big'],
    group: 'Basic blocks',
    run: (editor, range) =>
      base(editor, range).setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    searchTerms: ['h2', 'subtitle'],
    group: 'Basic blocks',
    run: (editor, range) =>
      base(editor, range).setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    searchTerms: ['h3', 'subheading'],
    group: 'Basic blocks',
    run: (editor, range) =>
      base(editor, range).setHeading({ level: 3 }).run(),
  },
  {
    title: 'Quote',
    description: 'Capture a quotation',
    icon: 'Q',
    searchTerms: ['blockquote', 'quote', 'cite'],
    group: 'Basic blocks',
    run: (editor, range) => base(editor, range).toggleBlockquote().run(),
  },
  {
    title: 'Divider',
    description: 'Visually separate sections',
    icon: '--',
    searchTerms: ['divider', 'horizontal', 'rule', 'hr', 'line', 'separator'],
    group: 'Basic blocks',
    run: (editor, range) => base(editor, range).setHorizontalRule().run(),
  },

  // ---------------------------------------------------------------- Lists
  {
    title: 'Bulleted list',
    description: 'Simple unordered list',
    icon: 'Ul',
    searchTerms: ['bullet', 'unordered', 'ul', 'list'],
    group: 'Lists',
    run: (editor, range) => base(editor, range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    description: 'List with ordering',
    icon: '1.',
    searchTerms: ['ordered', 'numbered', 'ol', 'list'],
    group: 'Lists',
    run: (editor, range) => base(editor, range).toggleOrderedList().run(),
  },
  {
    title: 'To-do list',
    description: 'Track tasks with checkboxes',
    icon: 'Td',
    searchTerms: ['todo', 'task', 'checkbox', 'check', 'list'],
    group: 'Lists',
    run: (editor, range) => base(editor, range).toggleTaskList().run(),
  },
  {
    title: 'Toggle list',
    description: 'Collapsible content',
    icon: 'Tg',
    searchTerms: ['toggle', 'collapse', 'details', 'accordion', 'expand'],
    group: 'Lists',
    run: (editor, range) => base(editor, range).setToggleBlock().run(),
  },

  // ---------------------------------------------------------------- Media
  {
    title: 'Image',
    description: 'Upload an image or paste a URL',
    icon: 'Img',
    searchTerms: ['image', 'img', 'picture', 'photo', 'media', 'upload'],
    group: 'Media',
    run: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run()
      // Dynamic import to keep block-commands free of client-only code
      import('@/lib/upload').then(({ triggerImageUpload }) => {
        triggerImageUpload(editor)
      })
    },
  },
  {
    title: 'Video',
    description: 'Embed a YouTube video',
    icon: 'Yt',
    searchTerms: ['video', 'youtube', 'embed', 'media', 'movie'],
    group: 'Media',
    run: (editor, range) => {
      const src = window.prompt('YouTube URL')
      if (!src) {
        base(editor, range).run()
        return
      }
      base(editor, range).setYoutubeVideo({ src }).run()
    },
  },
  {
    title: 'Code',
    description: 'Code block with highlighting',
    icon: '</>',
    searchTerms: ['code', 'codeblock', 'snippet', 'pre', 'fence'],
    group: 'Media',
    run: (editor, range) => base(editor, range).setCodeBlock().run(),
  },

  // ---------------------------------------------------------------- Advanced
  {
    title: 'Table',
    description: '3x3 table with header row',
    icon: 'Tb',
    searchTerms: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
    group: 'Advanced',
    run: (editor, range) =>
      base(editor, range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Variable',
    description: 'Search and insert a merge-field token',
    icon: '{x}',
    searchTerms: ['variable', 'merge', 'field', 'token', 'placeholder', 'dynamic'],
    group: 'Advanced',
    run: (editor, range) => {
      // Replace the slash query with `#`, the trigger the inline variable
      // search listens for. The user keeps typing to filter, so the whole flow
      // stays in the document. The side panel is still available from the
      // toolbar for anyone who prefers browsing.
      if (range) {
        editor.chain().focus().deleteRange(range).insertContent('#').run()
      } else {
        editor.chain().focus().insertContent('#').run()
      }
    },
  },
  {
    title: 'Button',
    description: 'Clickable button with a link',
    icon: 'Btn',
    searchTerms: ['button', 'cta', 'link', 'action', 'click'],
    group: 'Advanced',
    run: (editor, range) => base(editor, range).setButtonBlock().run(),
  },
  {
    title: 'Callout',
    description: 'Highlight important info',
    icon: 'Ci',
    searchTerms: ['callout', 'info', 'note', 'panel', 'aside', 'admonition'],
    group: 'Advanced',
    run: (editor, range) =>
      base(editor, range).toggleCallout({ variant: 'info' }).run(),
  },
  {
    title: 'Warning callout',
    description: 'Draw attention to a caveat',
    icon: 'Cw',
    searchTerms: ['warning', 'caution', 'callout', 'alert'],
    group: 'Advanced',
    run: (editor, range) =>
      base(editor, range).toggleCallout({ variant: 'warning' }).run(),
  },
  {
    title: 'Success callout',
    description: 'Confirm a positive outcome',
    icon: 'Cs',
    searchTerms: ['success', 'tip', 'callout', 'good', 'done'],
    group: 'Advanced',
    run: (editor, range) =>
      base(editor, range).toggleCallout({ variant: 'success' }).run(),
  },
  {
    title: 'Error callout',
    description: 'Flag something dangerous',
    icon: 'Ce',
    searchTerms: ['error', 'danger', 'callout', 'bad', 'stop'],
    group: 'Advanced',
    run: (editor, range) =>
      base(editor, range).toggleCallout({ variant: 'error' }).run(),
  },
]
