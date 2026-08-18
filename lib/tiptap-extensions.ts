import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Typography from '@tiptap/extension-typography'
import { TextStyle, Color, BackgroundColor, FontFamily } from '@tiptap/extension-text-style'
import { ListKeymap } from '@tiptap/extension-list'
import { Dropcursor, Gapcursor, UndoRedo, TrailingNode, CharacterCount } from '@tiptap/extensions'
import {
  // Blocks
  Paragraph,
  Heading,
  CodeBlock,
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem,
  Blockquote,
  HorizontalRule,
  Image,
  Youtube,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  Callout,
  ToggleBlock,
  ToggleSummary,
  ToggleContent,
  // Marks
  Bold,
  Italic,
  Code,
  Strike,
  Underline,
  Highlight,
  Link,
} from '@/components/editor/extensions'

/**
 * Single source of truth for the schema. Imported by the client editor
 * and by the server-side `generateHTML` route so both produce identical
 * Tailwind-classed markup.
 */
export const extensions = [
  // Core
  Document,
  Text,
  HardBreak,

  // Blocks
  Paragraph,
  Heading,
  CodeBlock,
  BulletList,
  OrderedList,
  ListItem,
  ListKeymap,
  TaskList,
  TaskItem,
  Blockquote,
  HorizontalRule,
  Image,
  Youtube,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  Callout,
  ToggleBlock,
  ToggleSummary,
  ToggleContent,

  // Marks
  Bold,
  Italic,
  Code,
  Strike,
  Underline,
  Highlight,
  Link,
  Subscript,
  Superscript,

  // Text styling
  TextStyle,
  Color,
  BackgroundColor,
  FontFamily,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
  }),

  // Behaviour / UX
  Typography,
  Dropcursor.configure({ color: '#3b82f6', width: 2 }),
  Gapcursor,
  UndoRedo,
  TrailingNode,
  CharacterCount,
]
