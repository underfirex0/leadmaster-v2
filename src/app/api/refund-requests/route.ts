export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Cost per field — must stay in sync with constants.ts
const FIELD_COSTS: Record<string, number> = {
  basic:1, phone:1, email:1, address:1, website:1,
  ice:2, annee_creation:2, director:2, effectif:2, capital:5,
}

// Compute the actual credits to refund
// - For new searches: credits_spent is exact (fixed in execute route)
// - For old searches: credits_spent was bugged (always 1), so we compute from fields array
function computeRefund(creditsSpent: number, fields: string[]): number {
  // If credits_spent looks correct (> 1 cr or only basic was requested), trust it
  if (creditsSpent > 1) return creditsSpent

  // Otherwise compute from fields array (slight overestimate — fields includes
  // all requested fields even if no data, but it's the best we can do for old data)
  const fromFields = fields.reduce((sum, f) => sum + (FIELD_COSTS[f] ?? 0), 0)
  return fromFields > 0 ? fromFields : creditsSpent
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'pending'

    const { data: requests, error } = await supabaseAdmin
      .from('refund_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!requests?.length) return NextResponse.json({ requests: [] })

    // Fetch profiles separately (no FK join needed)
    const userIds = [...new Set(requests.map(r => r.user_id as string))]
    const { data: profiles } = await supabaseAdmin
      .from('profiles').select('id, email, full_name').in('id', userIds)
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id as string, p]))

    const enriched = requests.map(r => ({
      ...r,
      profiles: profileMap[r.user_id as string] ?? null,
    }))

    return NextResponse.json({ requests: enriched })
  } catch (e) {
    console.error('GET refund-requests error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { lead_id, company_id, company_name, reason, note } = await request.json()
    if (!lead_id || !reason) return NextResponse.json({ error: 'lead_id et reason requis' }, { status: 400 })

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('refund_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: existing.status === 'pending'
          ? 'Une demande est déjà en cours pour cette entreprise'
          : 'Vous avez déjà signalé cette entreprise',
      }, { status: 409 })
    }

    // ── Compute exact credits to refund ──────────────────────
    let creditsToRefund = 0
    if (company_id) {
      const { data: unlock } = await supabaseAdmin
        .from('company_unlocks')
        .select('credits_spent, fields')
        .eq('user_id', user.id)
        .eq('company_id', company_id)
        .maybeSingle()

      if (unlock) {
        const fields = (unlock.fields as string[]) ?? []
        creditsToRefund = computeRefund(unlock.credits_spent ?? 0, fields)
      }
    }

    // Create refund request
    const { data: refundReq, error } = await supabaseAdmin
      .from('refund_requests')
      .insert({
        user_id: user.id, company_id, lead_id, company_name,
        reason, note: note || null,
        credits_to_refund: creditsToRefund,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Auto-archive the CRM lead
    await supabaseAdmin
      .from('crm_leads')
      .update({ status: 'archived' })
      .eq('id', lead_id)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true, request: refundReq, creditsToRefund,
      message: `Signalement envoyé. ${creditsToRefund > 0 ? `${creditsToRefund} cr seront remboursés après validation.` : ''}`,
    })
  } catch (e) {
    console.error('POST refund-requests error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
