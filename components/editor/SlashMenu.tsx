'use client'

import { SlashCmd } from '@harshtalks/slash-tiptap'
import type { Editor } from '@tiptap/core'
import { BLOCK_COMMANDS, type BlockGroup } from '@/lib/block-commands'

const GROUP_ORDER: BlockGroup[] = [
  'Basic blocks',
  'Lists',
  'Media',
  'Advanced',
]

interface SlashMenuProps {
  editor: Editor | null
}

export function SlashMenu({ editor }: SlashMenuProps) {
  return (
    <SlashCmd.Root editor={editor as never}>
      <SlashCmd.Cmd className="z-50 max-h-[22rem] w-80 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
        <SlashCmd.Empty className="px-3 py-6 text-center text-sm text-gray-400">
          No blocks found
        </SlashCmd.Empty>

        {GROUP_ORDER.map((group) => (
          <SlashCmd.Group
            key={group}
            heading={
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group}
              </div>
            }
          >
            {BLOCK_COMMANDS.filter((item) => item.group === group).map(
              (item) => (
                <SlashCmd.Item
                  key={item.title}
                  value={item.title}
                  keywords={item.searchTerms}
                  onCommand={({ editor, range }) => item.run(editor, range)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm outline-none aria-selected:bg-gray-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {item.description}
                    </span>
                  </span>
                </SlashCmd.Item>
              )
            )}
          </SlashCmd.Group>
        ))}
      </SlashCmd.Cmd>
    </SlashCmd.Root>
  )
}
