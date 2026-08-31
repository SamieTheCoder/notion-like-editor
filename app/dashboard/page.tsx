import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { initAuthDB, listVendors } from '@/lib/auth-db'
import { Building2 } from 'lucide-react'
import { LogoutButton } from '@/components/LogoutButton'
import { CreateVendorButton } from '@/components/CreateVendorButton'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  await initAuthDB()
  const vendors = await listVendors()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Vendors
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} · {session.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreateVendorButton />
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-3">
          {vendors.map((v) => (
            <Link
              key={v.id}
              href={`/dashboard/${v.id}`}
              className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: v.primary_color || '#6B7280' }}
              >
                <Building2 size={20} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-gray-900 group-hover:text-blue-600">
                  {v.name}
                </h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  {v.code} · {v.status}
                </p>
              </div>
              <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                Manage templates
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
