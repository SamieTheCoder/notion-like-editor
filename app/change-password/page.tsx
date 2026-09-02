import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'

export const metadata = { title: 'Change password' }
export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const forced = session.mustChangePassword === true

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {forced ? 'Set a new password' : 'Change password'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {forced
              ? 'For security, choose a new password before continuing.'
              : 'Update the password for your account.'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <ChangePasswordForm forced={forced} />
        </div>
      </div>
    </main>
  )
}
