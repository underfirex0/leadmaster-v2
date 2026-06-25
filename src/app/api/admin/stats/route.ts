export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const [
      { count: totalUsers },
      { count: totalCompanies },
      { count: totalUnlocks },
      { count: totalLeads },
      { count: totalSearches },
      { count: pendingSubs },
      { count: pendingRequests },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('company_unlocks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('crm_leads').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('queries').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('data_upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    // Credits used this month
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    const { data: txs } = await supabaseAdmin
      .from('credit_transactions').select('amount').gte('created_at', startOfMonth.toISOString())
    const creditsUsedThisMonth = (txs ?? []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

    // Plan distribution
    const { data: profiles } = await supabaseAdmin.from('profiles').select('plan_id')
    const plan_distribution: Record<string, number> = {}
    for (const p of profiles ?? []) {
      const pid = p.plan_id ?? 'decouverte'
      plan_distribution[pid] = (plan_distribution[pid] ?? 0) + 1
    }

    // Recent users
    const { data: recent_users } = await supabaseAdmin
      .from('profiles').select('id,email,full_name,plan_id,credit_balance,created_at')
      .order('created_at', { ascending: false }).limit(8)

    // Revenue from invoices (if table exists)
    let sub_revenue = 0, topup_revenue = 0, pending_amount = 0
    try {
      const { data: invoices } = await supabaseAdmin
        .from('invoices').select('type,amount_mad,status')
      for (const inv of invoices ?? []) {
        if (inv.status === 'paid' && inv.type === 'subscription') sub_revenue += inv.amount_mad
        if (inv.status === 'paid' && inv.type === 'credit_pack') topup_revenue += inv.amount_mad
        if (inv.status === 'pending') pending_amount += inv.amount_mad
      }
    } catch { /* invoices table might be empty */ }

    const total_revenue = sub_revenue + topup_revenue

    // Estimate MRR from active subscriptions
    const PLAN_PRICES: Record<string, number> = { solo: 149, equipe: 390, business: 990, entreprise: 0 }
    let mrr = 0
    try {
      const { data: activeSubs } = await supabaseAdmin
        .from('subscriptions').select('plan_id').eq('status', 'active')
      for (const s of activeSubs ?? []) mrr += PLAN_PRICES[s.plan_id] ?? 0
    } catch {}

    const pending_count = (pendingSubs ?? 0) + (pendingRequests ?? 0)

    return NextResponse.json({
      // Core counts
      total_users:       totalUsers ?? 0,
      total_companies:   totalCompanies ?? 0,
      total_unlocks:     totalUnlocks ?? 0,
      total_leads:       totalLeads ?? 0,
      total_searches:    totalSearches ?? 0,
      pending_count,
      pending_subs:      pendingSubs ?? 0,
      pending_requests:  pendingRequests ?? 0,
      // Revenue
      mrr,
      arr:               mrr * 12,
      sub_revenue,
      topup_revenue,
      pending_amount,
      total_revenue,
      // Credits
      credits_used_month: creditsUsedThisMonth,
      // Distribution
      plan_distribution,
      recent_users:      recent_users ?? [],
      // Legacy aliases (for any old admin pages)
      totalUsers:         totalUsers ?? 0,
      totalCompanies:     totalCompanies ?? 0,
      active_subs:        plan_distribution.solo ?? 0 + (plan_distribution.equipe ?? 0) + (plan_distribution.business ?? 0),
    })
  } catch (e) {
    console.error('Admin stats error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
