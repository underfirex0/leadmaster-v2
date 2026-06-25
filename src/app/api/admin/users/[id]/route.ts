export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
type P = { params: { id: string } }

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await req.json()
    const { action, amount, reason, plan_id } = body

    if (action === 'add_credits') {
      const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', params.id).single()
      const newBalance = (profile?.credit_balance ?? 0) + Number(amount)
      await supabaseAdmin.from('profiles').update({ credit_balance: newBalance }).eq('id', params.id)
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: params.id, amount: Number(amount),
        balance_after: newBalance, type: 'grant',
        description: reason ?? `Crédit manuel par admin`,
      })
      return NextResponse.json({ success: true, message: `${amount} crédits ajoutés`, newBalance })
    }

    if (action === 'set_credits') {
      await supabaseAdmin.from('profiles').update({ credit_balance: Number(amount) }).eq('id', params.id)
      return NextResponse.json({ success: true, message: `Solde défini à ${amount} crédits` })
    }

    if (action === 'activate_plan') {
      const CREDITS: Record<string, number> = { decouverte:100, solo:400, equipe:1500, business:5000 }
      const credits = CREDITS[plan_id] ?? 0
      await supabaseAdmin.from('profiles').update({ plan_id, credit_balance: credits }).eq('id', params.id)
      await supabaseAdmin.from('subscriptions').upsert({
        user_id: params.id, plan_id, status: 'active',
        credits_per_month: credits,
        started_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      return NextResponse.json({ success: true, message: `Plan ${plan_id} activé` })
    }

    if (action === 'grant_admin') {
      await supabaseAdmin.from('profiles').update({ is_admin: true }).eq('id', params.id)
      return NextResponse.json({ success: true, message: 'Accès admin accordé' })
    }

    if (action === 'revoke_admin') {
      await supabaseAdmin.from('profiles').update({ is_admin: false }).eq('id', params.id)
      return NextResponse.json({ success: true, message: 'Accès admin retiré' })
    }

    if (action === 'reset_free_trial') {
      await supabaseAdmin.from('profiles').update({ free_trial_used: false }).eq('id', params.id)
      return NextResponse.json({ success: true, message: 'Essai gratuit réinitialisé' })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e) {
    console.error('Admin user PATCH error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
