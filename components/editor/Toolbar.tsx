'use client'

import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { useCallback } from 'react'
import { BLOCK_COMMANDS } from '@/lib/block-commands'
import { CODE_LANGUAGES } from '@/components/editor/extensions'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ListChecks,
  TextQuote,
  Info,
  ChevronRight,
  Minus,
  Table,
  Undo2,
  Redo2,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker'

/** Uniform icon sizing + stroke for every toolbar control. */
const ICON = { size: 16, strokeWidth: 1.5 } as const

interface ToolbarProps {
  editor: Editor | null
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-gray-200" />
}

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        aria-pressed={active}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {title}
      </span>
    </div>
  )
}

const selectClass =
  'h-8 shrink-0 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-blue-500'

export function Toolbar({ editor }: ToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        link: e.isActive('link'),
        sub: e.isActive('subscript'),
        sup: e.isActive('superscript'),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        taskList: e.isActive('taskList'),
        blockquote: e.isActive('blockquote'),
        codeBlock: e.isActive('codeBlock'),
        callout: e.isActive('callout'),
        inTable: e.isActive('table'),
        alignLeft: e.isActive({ textAlign: 'left' }),
        alignCenter: e.isActive({ textAlign: 'center' }),
        alignRight: e.isActive({ textAlign: 'right' }),
        alignJustify: e.isActive({ textAlign: 'justify' }),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        textColor: (e.getAttributes('textStyle').color as string) || '',
        highlight: (e.getAttributes('highlight').color as string) || '',
        codeLanguage: (e.getAttributes('codeBlock').language as string) || 'plaintext',
        blockLabel: e.isActive('heading', { level: 1 })
          ? 'Heading 1'
          : e.isActive('heading', { level: 2 })
            ? 'Heading 2'
            : e.isActive('heading', { level: 3 })
              ? 'Heading 3'
              : e.isActive('taskList')
                ? 'To-do list'
                : e.isActive('bulletList')
                  ? 'Bulleted list'
                  : e.isActive('orderedList')
                    ? 'Numbered list'
                    : e.isActive('codeBlock')
                      ? 'Code'
                      : e.isActive('blockquote')
                        ? 'Quote'
                        : 'Text',
      }
    },
  })

  const setLink = useCallback(() => {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor || !state) return null

  const c = () => editor.chain().focus()

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 overflow-visible rounded-t-xl border-b border-gray-200 bg-white/90 px-2 py-1.5 backdrop-blur">
      <select
        value={state.blockLabel}
        onChange={(e) => {
          const cmd = BLOCK_COMMANDS.find((b) => b.title === e.target.value)
          cmd?.run(editor)
        }}
        title="Turn into"
        aria-label="Turn into"
        className={`mr-1 ${selectClass}`}
      >
        {[
          'Text',
          'Heading 1',
          'Heading 2',
          'Heading 3',
          'Bulleted list',
          'Numbered list',
          'To-do list',
          'Quote',
          'Code',
        ].map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>

      <Divider />

      <Btn onClick={() => c().toggleBold().run()} active={state.bold} title="Bold (⌘B)">
        <Bold {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleItalic().run()} active={state.italic} title="Italic (⌘I)">
        <Italic {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleUnderline().run()} active={state.underline} title="Underline (⌘U)">
        <Underline {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleStrike().run()} active={state.strike} title="Strikethrough">
        <Strikethrough {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleCode().run()} active={state.code} title="Inline code (⌘E)">
        <Code {...ICON} />
      </Btn>
      <Btn onClick={setLink} active={state.link} title="Link (⌘K)">
        <LinkIcon {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleSubscript().run()} active={state.sub} title="Subscript">
        <Subscript {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleSuperscript().run()} active={state.sup} title="Superscript">
        <Superscript {...ICON} />
      </Btn>

      <Divider />

      <ColorPicker
        variant="light"
        currentTextColor={state.textColor}
        currentBgColor={state.highlight}
        onTextColor={(color) => {
          if (color) c().setColor(color).run()
          else c().unsetColor().run()
        }}
        onBgColor={(color) => {
          if (color) c().setHighlight({ color }).run()
          else c().unsetHighlight().run()
        }}
      />

      <Divider />

      <Btn onClick={() => c().setTextAlign('left').run()} active={state.alignLeft} title="Align left">
        <AlignLeft {...ICON} />
      </Btn>
      <Btn onClick={() => c().setTextAlign('center').run()} active={state.alignCenter} title="Align center">
        <AlignCenter {...ICON} />
      </Btn>
      <Btn onClick={() => c().setTextAlign('right').run()} active={state.alignRight} title="Align right">
        <AlignRight {...ICON} />
      </Btn>
      <Btn onClick={() => c().setTextAlign('justify').run()} active={state.alignJustify} title="Justify">
        <AlignJustify {...ICON} />
      </Btn>

      <Divider />

      <Btn onClick={() => c().toggleBulletList().run()} active={state.bulletList} title="Bulleted list">
        <List {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleOrderedList().run()} active={state.orderedList} title="Numbered list">
        <ListOrdered {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleTaskList().run()} active={state.taskList} title="To-do list">
        <ListChecks {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleBlockquote().run()} active={state.blockquote} title="Quote">
        <TextQuote {...ICON} />
      </Btn>
      <Btn
        onClick={() => c().toggleCallout({ variant: 'info' }).run()}
        active={state.callout}
        title="Callout"
      >
        <Info {...ICON} />
      </Btn>
      <Btn onClick={() => c().setToggleBlock().run()} title="Toggle list">
        <ChevronRight {...ICON} />
      </Btn>
      <Btn onClick={() => c().setHorizontalRule().run()} title="Divider">
        <Minus {...ICON} />
      </Btn>
      <Btn
        onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        active={state.inTable}
        title="Insert table"
      >
        <Table {...ICON} />
      </Btn>

      {state.codeBlock && (
        <>
          <Divider />
          <select
            value={state.codeLanguage}
            onChange={(e) =>
              c().updateAttributes('codeBlock', { language: e.target.value }).run()
            }
            title="Code language"
            aria-label="Code language"
            className={selectClass}
          >
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </>
      )}

      <Divider />

      <Btn onClick={() => c().undo().run()} disabled={!state.canUndo} title="Undo (⌘Z)">
        <Undo2 {...ICON} />
      </Btn>
      <Btn onClick={() => c().redo().run()} disabled={!state.canRedo} title="Redo (⌘⇧Z)">
        <Redo2 {...ICON} />
      </Btn>
    </div>
  )
}
