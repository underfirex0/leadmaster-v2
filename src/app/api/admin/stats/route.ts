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
      { count: pendingSubs },
      { count: pendingRequests },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('company_unlocks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('crm_leads').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('data_upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    // Credits distributed this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    const { data: txs } = await supabaseAdmin
      .from('credit_transactions')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString())
    const creditsUsedThisMonth = (txs ?? []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

    return NextResponse.json({
      totalUsers:            totalUsers ?? 0,
      totalCompanies:        totalCompanies ?? 0,
      totalUnlocks:          totalUnlocks ?? 0,
      totalLeads:            totalLeads ?? 0,
      pendingSubscriptions:  pendingSubs ?? 0,
      pendingRequests:       pendingRequests ?? 0,
      creditsUsedThisMonth,
    })
  } catch (e) {
    console.error('Admin stats error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
