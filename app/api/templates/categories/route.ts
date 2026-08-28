import { NextResponse } from 'next/server'
import { initSaasDB, createCategory, getCategoriesByOrg, updateCategory, deleteCategory } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

/** GET /api/templates/categories - List categories */
export const GET = withAuth(async (_req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()
    const categories = await getCategoriesByOrg(ctx.orgId)
    return NextResponse.json({ success: true, data: { categories } })
  } catch (error) {
    console.error('List categories error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list categories' },
      { status: 500 }
    )
  }
})

/** POST /api/templates/categories - Create a category */
export const POST = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const body = await req.json() as {
      name?: string
      color?: string
      sort_order?: number
    }

    if (!body.name) {
      return NextResponse.json(
        { success: false, message: 'name is required' },
        { status: 400 }
      )
    }

    const category = await createCategory({
      org_id: ctx.orgId,
      name: body.name,
      color: body.color,
      sort_order: body.sort_order,
    })

    return NextResponse.json({
      success: true,
      data: { category },
    }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    )
  }
})

/** PUT /api/templates/categories - Update a category */
export const PUT = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const body = await req.json() as {
      id?: string
      name?: string
      color?: string
      sort_order?: number
    }

    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'id is required' },
        { status: 400 }
      )
    }

    const category = await updateCategory(body.id, {
      name: body.name,
      color: body.color,
      sort_order: body.sort_order,
    })

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { category } })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update category' },
      { status: 500 }
    )
  }
})

/** DELETE /api/templates/categories - Delete a category */
export const DELETE = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id query parameter is required' },
        { status: 400 }
      )
    }

    const deleted = await deleteCategory(id)
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'Category deleted' } })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete category' },
      { status: 500 }
    )
  }
})
