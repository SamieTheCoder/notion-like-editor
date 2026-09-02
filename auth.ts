/**
 * Auth.js (NextAuth v5) configuration — the single source of truth for auth.
 *
 * Credentials provider backed by the existing PostgreSQL user table and bcrypt
 * hashes. Sessions are JWTs (required by the Credentials provider), and the
 * token carries the fields the app authorizes on:
 *
 *   role                 SUPER_ADMIN | ADMIN | MEMBER
 *   vendorId             the vendor this user is scoped to (number | null)
 *   mustChangePassword   forces the /change-password gate on first login
 *
 * Next.js 16 runs proxy.ts on the Node.js runtime, so importing `pg` and
 * `bcryptjs` here is safe and proxy.ts can re-export `auth` directly.
 */
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { findUserByEmail, getUserById, initAuthDB } from './lib/auth-db'

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? credentials.email.trim() : ''
        const password =
          typeof credentials?.password === 'string' ? credentials.password : ''

        if (!email || !password) return null

        await initAuthDB()
        const user = await findUserByEmail(email)

        // Returning null yields a generic CredentialsSignin error, so we never
        // leak whether the email exists or the password was wrong.
        if (!user || !user.password_hash) return null
        if (user.status !== 'ACTIVE') return null

        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null

        return {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
          role: user.role,
          vendorId: user.vendor_id == null ? null : Number(user.vendor_id),
          mustChangePassword: user.must_change_password === true,
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Copy the custom fields onto the token at sign-in, and allow an in-place
     * refresh (used after a password change clears mustChangePassword).
     */
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.vendorId = user.vendorId
        token.mustChangePassword = user.mustChangePassword
        token.checkedAt = Date.now()
        return token
      }

      if (trigger === 'update' && session) {
        // Accepts either { mustChangePassword } or { user: { mustChangePassword } }.
        const patch = session as {
          mustChangePassword?: unknown
          user?: { mustChangePassword?: unknown }
        }
        const next =
          typeof patch.mustChangePassword === 'boolean'
            ? patch.mustChangePassword
            : typeof patch.user?.mustChangePassword === 'boolean'
              ? patch.user.mustChangePassword
              : undefined
        if (next !== undefined) token.mustChangePassword = next
      }

      // Revalidate against the DB so a deleted or deactivated user is logged
      // out instead of riding their JWT until it expires. Throttled to once a
      // minute to avoid a query on every request.
      const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0
      if (Date.now() - checkedAt > 60_000) {
        const id = Number(token.sub)
        if (Number.isFinite(id)) {
          try {
            const current = await getUserById(id)
            if (!current || current.status !== 'ACTIVE') {
              // Returning null invalidates the session.
              return null
            }
            // Keep role/vendor fresh in case they changed.
            token.role = current.role
            token.vendorId =
              current.vendor_id == null ? null : Number(current.vendor_id)
            token.checkedAt = Date.now()
          } catch {
            // DB hiccup: keep the existing token rather than logging everyone
            // out on a transient error.
          }
        }
      }
      return token
    },

    /** Expose the custom fields to server components and the client. */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? '')
        session.user.role = (token.role as string) ?? 'MEMBER'
        session.user.vendorId = (token.vendorId as number | null) ?? null
        session.user.mustChangePassword = token.mustChangePassword === true
      }
      return session
    },
  },
})
