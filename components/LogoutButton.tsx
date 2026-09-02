'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: '/' })}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      <LogOut size={16} />
      Sign out
    </button>
  )
}
