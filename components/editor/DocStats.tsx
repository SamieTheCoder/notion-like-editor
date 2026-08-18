'use client'

import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface DocStatsProps {
  /**
   * Must be a live editor, never null.
   *
   * `useEditorState` builds its snapshot manager once, from the editor it first
   * receives, and only re-notifies subscribers on editor transactions. Mounting
   * this component with `null` would cache a null snapshot and report zeros
   * until the user's first edit, so the parent gates rendering on a ready
   * editor instead.
   */
  editor: Editor
}

/** Live word and character count for the current document. */
export function DocStats({ editor }: DocStatsProps) {
  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { words: 0, chars: 0 }
      const cc = e.storage.characterCount as
        | { words: () => number; characters: () => number }
        | undefined
      return {
        words: cc?.words() ?? 0,
        chars: cc?.characters() ?? 0,
      }
    },
  })

  return (
    <span>
      {stats?.words ?? 0} words · {stats?.chars ?? 0} characters
    </span>
  )
}
