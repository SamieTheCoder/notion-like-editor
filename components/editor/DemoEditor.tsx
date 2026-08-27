'use client'

import { TiptapEditor } from './TiptapEditor'
import { EmailShellFrame } from './EmailShellFrame'
import { useEmailShells, EmailShellPicker } from './EmailShellPicker'

/**
 * The standalone demo editor, framed by the email shell.
 *
 * `/editor` is a server component, so the shell fetch and its state live here.
 * This keeps the demo page and saved-document pages showing the same framing
 * instead of the demo silently lacking it.
 */
export function DemoEditor() {
  const {
    shells,
    activeShell,
    activeShellId,
    setActiveShellId,
    showShell,
    setShowShell,
  } = useEmailShells()

  return (
    <div>
      {shells.length > 0 && (
        <div className="mb-4 flex items-center justify-end gap-2">
          <span className="text-xs text-gray-500">Email shell</span>
          <EmailShellPicker
            shells={shells}
            activeShellId={activeShellId}
            onSelect={setActiveShellId}
            showShell={showShell}
            onToggle={() => setShowShell(!showShell)}
          />
        </div>
      )}

      {showShell && activeShell ? (
        <EmailShellFrame config={activeShell.config}>
          <TiptapEditor templateId={activeShellId} />
        </EmailShellFrame>
      ) : (
        <TiptapEditor templateId={activeShellId} />
      )}
    </div>
  )
}
