import { NextResponse } from 'next/server'
import { initSaasDB, getUsersByOrg, createUser, getUserByEmail } from '@/lib/saas-db'
import { hashPassword } from '@/lib/auth'
import { withAuth, type AuthContext } from '@/lib/api-middleware'
import crypto from 'crypto'

export const runtime = 'nodejs'

/** GET /api/organizations/members - List organization members */
export const GET = withAuth(async (_req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()
    const members = await getUsersByOrg(ctx.orgId)
    return NextResponse.json({ success: true, data: { members } })
  } catch (error) {
    console.error('List members error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list members' },
      { status: 500 }
    )
  }
})

/** POST /api/organizations/members - Invite a new member */
export const POST = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only owners and admins can invite members' },
        { status: 403 }
      )
    }

    const body = await req.json() as {
      email?: string
      first_name?: string
      last_name?: string
      role?: 'ADMIN' | 'MEMBER'
    }

    if (!body.email || !body.first_name || !body.last_name) {
      return NextResponse.json(
        { success: false, message: 'email, first_name, and last_name are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email already registered
    const existing = await getUserByEmail(body.email)
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      )
    }

    // Create user with a temporary password (they'll need to reset)
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(tempPassword)

    const member = await createUser({
      org_id: ctx.orgId,
      email: body.email,
      password_hash: passwordHash,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role || 'MEMBER',
    })

    return NextResponse.json({
      success: true,
      data: {
        member: {
          id: member.id,
          email: member.email,
          first_name: member.first_name,
          last_name: member.last_name,
          role: member.role,
          status: member.status,
        },
        // In production, send an invite email instead of returning the temp password
        tempPassword,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Invite member error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to invite member' },
      { status: 500 }
    )
  }
})
