'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/components/saas/DashboardLayout'
import {
  Key,
  Copy,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface ApiKey {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
}

interface Member {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  status: string
  created_at: string
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace configuration</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <OrgTab />
        </TabsContent>
        <TabsContent value="keys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Org Tab ─────────────────────────────────────────────────────────────────

function OrgTab() {
  const { org } = useAuth()
  const [form, setForm] = useState({ name: '', primaryColor: '#3b82f6' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (org) {
      setForm({ name: org.name, primaryColor: org.primaryColor || '#3b82f6' })
    }
  }, [org])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {}
    setSaving(false)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>Update your workspace name and branding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand-color">Brand Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="w-10 h-10 rounded-md border cursor-pointer"
            />
            <Input
              id="brand-color"
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="w-32 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Workspace Slug</Label>
          <Input
            id="slug"
            readOnly
            disabled
            value={org?.slug || ''}
          />
          <p className="text-xs text-muted-foreground">This cannot be changed</p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <><CheckCircle2 className="size-4" /> Saved!</>
          ) : (
            <><Save className="size-4" /> {saving ? 'Saving...' : 'Save Changes'}</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── API Keys Tab ────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)

  useEffect(() => { loadKeys() }, [])

  async function loadKeys() {
    try {
      const res = await fetch('/api/organizations/api-keys')
      if (res.ok) {
        const data = await res.json()
        if (data.success) setKeys(data.data?.keys || [])
      }
    } catch {}
    setLoading(false)
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return
    try {
      const res = await fetch('/api/organizations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()
      if (data.success) {
        setCreatedKey(data.data.key)
        setNewKeyName('')
        loadKeys()
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/organizations/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      loadKeys()
    } catch {}
    setDeleteTarget(null)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="size-4" /> API Keys
        </CardTitle>
        <CardDescription>
          Use API keys to access your templates programmatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new */}
        <div className="flex items-center gap-2">
          <Input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production)"
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
            <Plus className="size-4" />
            Generate
          </Button>
        </div>

        {/* Created key notice */}
        {createdKey && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="size-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Save this key — it won&apos;t be shown again:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-card border px-3 py-2 rounded-md font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(createdKey)}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Keys list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-7 w-7" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No API keys yet</p>
        ) : (
          <div className="space-y-1">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{key.prefix}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDeleteTarget(key)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    try {
      const res = await fetch('/api/organizations/members')
      if (res.ok) {
        const data = await res.json()
        if (data.success) setMembers(data.data?.members || [])
      }
    } catch {}
    setLoading(false)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/organizations/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteEmail('')
        loadMembers()
      } else {
        alert(data.message || 'Failed to invite')
      }
    } catch {}
    setInviting(false)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Manage who has access to your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="pl-8"
            />
          </div>
          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
          >
            <Plus className="size-4" />
            Invite
          </Button>
        </div>

        <Separator />

        {/* Members list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No team members yet</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {member.first_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                    {member.role.toLowerCase()}
                  </Badge>
                  <Badge variant={member.status === 'ACTIVE' ? 'outline' : 'secondary'}>
                    {member.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
