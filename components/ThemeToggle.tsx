'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

/**
 * Light/dark toggle.
 *
 * The resolved theme is unknown during SSR, so EVERY theme-dependent output
 * (icon and aria-label alike) stays neutral until after mount. Gating only the
 * icon still produces a hydration mismatch on the label.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label={
        mounted
          ? isDark
            ? 'Switch to light mode'
            : 'Switch to dark mode'
          : 'Toggle color theme'
      }
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
    >
      {mounted ? (
        isDark ? (
          <Sun size={16} strokeWidth={1.75} />
        ) : (
          <Moon size={16} strokeWidth={1.75} />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
