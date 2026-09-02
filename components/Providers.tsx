'use client'

import { ThemeProvider } from 'next-themes'

/**
 * Client wrapper for next-themes. Adds/removes the `dark` class on <html>,
 * which is what the OKLCH token set in globals.css switches on.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
