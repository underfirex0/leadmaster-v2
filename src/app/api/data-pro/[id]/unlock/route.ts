export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type P = { params: { id: string } }

export async function POST(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: dataset } = await supabaseAdmin
      .from('datasets').select('id, name, credit_cost, is_active').eq('id', params.id).single()
    if (!dataset || !dataset.is_active) return NextResponse.json({ error: 'Dataset introuvable' }, { status: 404 })

    // Already unlocked? Idempotent — just confirm.
    const { data: existing } = await supabaseAdmin
      .from('dataset_unlocks').select('id').eq('user_id', user.id).eq('dataset_id', params.id).maybeSingle()
    if (existing) return NextResponse.json({ success: true, alreadyUnlocked: true })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()
    const balance = profile?.credit_balance ?? 0
    const cost = dataset.credit_cost ?? 0

    if (cost > balance) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût: ${cost.toLocaleString('fr-FR')} cr, solde: ${balance.toLocaleString('fr-FR')} cr`,
        required: cost, available: balance,
      }, { status: 402 })
    }

    const { error: insErr } = await supabaseAdmin.from('dataset_unlocks').insert({
      user_id: user.id, dataset_id: params.id, credits_spent: cost,
    })
    if (insErr) throw insErr

    if (cost > 0) {
      await supabaseAdmin.from('profiles').update({ credit_balance: balance - cost }).eq('id', user.id)
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id, amount: -cost, balance_after: balance - cost,
        type: 'data_pro_unlock', description: `DATA Pro : ${dataset.name}`,
      })
    }

    return NextResponse.json({ success: true, newBalance: balance - cost })
  } catch (e) {
    console.error('DATA Pro unlock error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
