/**
 * Auth.js type augmentation for the app's custom session fields.
 */
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role?: string
    vendorId?: number | null
    mustChangePassword?: boolean
  }

  interface Session {
    user: {
      id: string
      role: string
      vendorId: number | null
      mustChangePassword: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    vendorId?: number | null
    mustChangePassword?: boolean
    checkedAt?: number
  }
}
