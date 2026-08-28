'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Settings,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  FolderOpen,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// ─── Auth Context ────────────────────────────────────────────────────────────

interface SaasUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
}

interface SaasOrg {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string
}

interface AuthState {
  user: SaasUser | null
  org: SaasOrg | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  org: null,
  loading: true,
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Auth Provider ───────────────────────────────────────────────────────────

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SaasUser | null>(null)
  const [org, setOrg] = useState<SaasOrg | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchMe()
  }, [])

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Not authenticated')
      const data = await res.json()
      if (data.success) {
        setUser(data.data.user)
        setOrg(data.data.org)
      } else {
        throw new Error(data.message)
      }
    } catch {
      setUser(null)
      setOrg(null)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setOrg(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, org, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Nav Items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/templates', icon: FileText, label: 'Templates' },
  { href: '/dashboard/categories', icon: FolderOpen, label: 'Categories' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
]

const NAV_BOTTOM = [
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex flex-col gap-1 flex-1">
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <Button
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-2',
                  active && 'font-semibold'
                )}
              >
                <Icon className="size-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>

      <Separator className="my-2" />

      <div className="flex flex-col gap-1">
        {NAV_BOTTOM.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <Button
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-2',
                  active && 'font-semibold'
                )}
              >
                <Icon className="size-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function Sidebar() {
  const { org } = useAuth()

  return (
    <aside className="hidden md:flex w-14 lg:w-60 flex-col border-r bg-card p-2 lg:p-3 gap-3">
      {/* Logo / Org */}
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          <Mail className="size-4" />
        </div>
        <span className="hidden lg:block text-sm font-semibold text-foreground truncate">
          {org?.name || 'MailCraft'}
        </span>
      </div>

      <Separator />

      <SidebarNav />
    </aside>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  const { user, org, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-40">
      {/* Left: Mobile menu + Org name */}
      <div className="flex items-center gap-3">
        {/* Mobile sidebar trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <span className="text-sm font-medium text-foreground hidden sm:block">
          {org?.name || 'MailCraft'}
        </span>
      </div>

      {/* Right: User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="gap-2 px-2" />
          }
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {user?.firstName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

// ─── Layout Shell ────────────────────────────────────────────────────────────

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutShell>{children}</LayoutShell>
    </AuthProvider>
  )
}
