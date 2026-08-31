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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to continue to your workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Protected area. Authorized users only.
        </p>
      </div>
    </main>
  )
}
