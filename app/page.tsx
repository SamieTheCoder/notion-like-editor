import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LoginForm } from '@/components/LoginForm'

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to your account.',
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
