/**
 * Aggregated analytics for the super-admin dashboard.
 *
 * All queries hit the same PostgreSQL pool used by the auth layer. Numbers are
 * cast to int in SQL so they arrive as JS numbers, not strings.
 */
import { authPool } from './auth-db'

const VENDOR_TABLE = 'notion_sam_vendor'
const USER_TABLE = 'notion_sam_user'
const TEMPLATE_TABLE = 'notion_sam_email_templates'

export interface DashboardTotals {
  vendors: number
  templates: number
  users: number
  activeVendors: number
}

export interface VendorBreakdown {
  id: number
  name: string
  vendor_name: string
  status: string
  primary_color: string | null
  favicon_url: string | null
  templates: number
  users: number
  updated_at: string
}

export interface RecentTemplate {
  id: number
  name: string
  trigger: string | null
  vendor_id: number | null
  vendor_name: string | null
  is_active: string
  updated_at: string
}

export interface MonthlyPoint {
  month: string // e.g. "Apr"
  count: number
}

export interface DashboardAnalytics {
  totals: DashboardTotals
  vendors: VendorBreakdown[]
  recentTemplates: RecentTemplate[]
  monthly: MonthlyPoint[]
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const [totalsRes, vendorsRes, recentRes, monthlyRes] = await Promise.all([
    authPool.query<{
      vendors: number
      templates: number
      users: number
      active_vendors: number
    }>(
      `SELECT
         (SELECT count(*)::int FROM ${VENDOR_TABLE})                                   AS vendors,
         (SELECT count(*)::int FROM ${TEMPLATE_TABLE})                                 AS templates,
         (SELECT count(*)::int FROM ${USER_TABLE})                                     AS users,
         (SELECT count(*)::int FROM ${VENDOR_TABLE} WHERE status = 'ACTIVE')           AS active_vendors`
    ),

    authPool.query<VendorBreakdown>(
      `SELECT v.id, v.name, v.vendor_name, v.status, v.primary_color, v.favicon_url, v.updated_at,
              coalesce(t.n, 0)::int AS templates,
              coalesce(u.n, 0)::int AS users
       FROM ${VENDOR_TABLE} v
       LEFT JOIN (
         SELECT vendor_id, count(*) AS n FROM ${TEMPLATE_TABLE}
         WHERE vendor_id IS NOT NULL GROUP BY vendor_id
       ) t ON t.vendor_id = v.id
       LEFT JOIN (
         SELECT vendor_id, count(*) AS n FROM ${USER_TABLE}
         WHERE vendor_id IS NOT NULL GROUP BY vendor_id
       ) u ON u.vendor_id = v.id
       ORDER BY templates DESC, v.id ASC`
    ),

    authPool.query<RecentTemplate>(
      `SELECT t.id, t.name, t.trigger, t.vendor_id, v.name AS vendor_name, t.is_active, t.updated_at
       FROM ${TEMPLATE_TABLE} t
       LEFT JOIN ${VENDOR_TABLE} v ON v.id = t.vendor_id
       ORDER BY t.updated_at DESC
       LIMIT 6`
    ),

    authPool.query<{ month: string; count: number }>(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', now()) - interval '5 months',
           date_trunc('month', now()),
           interval '1 month'
         ) AS m
       )
       SELECT to_char(months.m, 'Mon') AS month,
              count(t.id)::int          AS count
       FROM months
       LEFT JOIN ${TEMPLATE_TABLE} t
         ON date_trunc('month', t.created_at) = months.m
       GROUP BY months.m
       ORDER BY months.m ASC`
    ),
  ])

  const tot = totalsRes.rows[0]
  return {
    totals: {
      vendors: tot?.vendors ?? 0,
      templates: tot?.templates ?? 0,
      users: tot?.users ?? 0,
      activeVendors: tot?.active_vendors ?? 0,
    },
    vendors: vendorsRes.rows,
    recentTemplates: recentRes.rows,
    monthly: monthlyRes.rows.map((r) => ({ month: r.month, count: r.count })),
  }
}
