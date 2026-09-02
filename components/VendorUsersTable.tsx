import { KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateUserButton } from '@/components/CreateUserButton'
import { DeleteButton } from '@/components/DeleteButton'

interface UserRow {
  id: number
  email: string
  first_name: string
  last_name: string | null
  role: string
  status: string
  must_change_password: boolean
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  MEMBER: 'Member',
}

export function VendorUsersTable({
  vendorId,
  vendorName,
  users,
  canManage,
  createsRole,
  viewerRole,
  viewerId,
}: {
  vendorId: number
  vendorName: string
  users: UserRow[]
  canManage: boolean
  createsRole: string
  viewerRole: string
  viewerId: number
}) {
  const roleWord = createsRole === 'ADMIN' ? 'admin' : 'member'

  /** Mirrors the server rules in DELETE /api/users/[userId]. */
  function canDelete(u: UserRow): boolean {
    if (!canManage) return false
    if (u.id === viewerId) return false
    if (viewerRole === 'SUPER_ADMIN') return u.role !== 'SUPER_ADMIN'
    return u.role === 'MEMBER'
  }

  const showActions = users.some(canDelete)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Users</CardTitle>
          <p className="text-sm text-muted-foreground">
            {users.length} with access to {vendorName}.
          </p>
        </div>
        {canManage && (
          <CreateUserButton
            vendorId={vendorId}
            vendorName={vendorName}
            createsRole={createsRole}
          />
        )}
      </CardHeader>

      <CardContent className={users.length === 0 ? undefined : 'px-0'}>
        {users.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No users yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {canManage
                ? `Add an ${roleWord} to give someone access to this vendor.`
                : 'Ask a vendor admin to invite you.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Email</th>
                  <th className="px-6 py-2 font-medium">Role</th>
                  <th className="px-6 py-2 font-medium">Status</th>
                  {showActions && <th className="px-6 py-2" />}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="outline">
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      {u.must_change_password ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <KeyRound size={12} strokeWidth={2} />
                          Password reset pending
                        </span>
                      ) : (
                        <Badge variant="secondary">{u.status}</Badge>
                      )}
                    </td>
                    {showActions && (
                      <td className="px-6 py-3">
                        <div className="flex justify-end">
                          {canDelete(u) && (
                            <DeleteButton
                              url={`/api/users/${u.id}`}
                              label={u.email}
                              srLabel={`Delete ${u.email}`}
                              warning={`${u.email} will lose access to ${vendorName} immediately. This cannot be undone.`}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
