'use client'

import { BubbleMenu } from '@tiptap/react/menus'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  RemoveFormatting,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker'

const ICON = { size: 15, strokeWidth: 1.5 } as const

interface SelectionBubbleMenuProps {
  editor: Editor | null
}

function Btn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm transition-colors ${
        active ? 'bg-white/20 text-white' : 'text-gray-200 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

export function SelectionBubbleMenu({ editor }: SelectionBubbleMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            strike: e.isActive('strike'),
            code: e.isActive('code'),
            link: e.isActive('link'),
            textColor: (e.getAttributes('textStyle').color as string) || '',
            highlight: (e.getAttributes('highlight').color as string) || '',
          }
        : null,
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
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor: e, from, to }) => {
        if (from === to) return false
        if (e.isActive('codeBlock')) return false
        if (e.isActive('image') || e.isActive('youtube')) return false
        return true
      }}
      className="flex items-center gap-0.5 rounded-lg bg-gray-900 px-1 py-1 shadow-xl ring-1 ring-black/20"
    >
      <Btn onClick={() => c().toggleBold().run()} active={state.bold} title="Bold">
        <Bold {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleItalic().run()} active={state.italic} title="Italic">
        <Italic {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleUnderline().run()} active={state.underline} title="Underline">
        <Underline {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleStrike().run()} active={state.strike} title="Strikethrough">
        <Strikethrough {...ICON} />
      </Btn>
      <Btn onClick={() => c().toggleCode().run()} active={state.code} title="Inline code">
        <Code {...ICON} />
      </Btn>

      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/20" />

      <Btn onClick={setLink} active={state.link} title="Link">
        <LinkIcon {...ICON} />
      </Btn>

      <ColorPicker
        variant="dark"
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

      <Btn onClick={() => c().unsetAllMarks().run()} title="Clear formatting">
        <RemoveFormatting {...ICON} />
      </Btn>
    </BubbleMenu>
  )
}
