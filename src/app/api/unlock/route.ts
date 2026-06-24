export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { UNLOCK_COST_PER_COMPANY } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    // Support single or batch unlock
    const companyIds: string[] = body.company_ids ?? (body.company_id ? [body.company_id] : [])
    if (!companyIds.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    // Check which are already unlocked (free for those)
    const { data: existing } = await supabaseAdmin
      .from('company_unlocks')
      .select('company_id')
      .eq('user_id', user.id)
      .in('company_id', companyIds)

    const alreadyUnlocked = new Set((existing ?? []).map(u => u.company_id))
    const toUnlock = companyIds.filter(id => !alreadyUnlocked.has(id))
    const cost = toUnlock.length * UNLOCK_COST_PER_COMPANY

    // Get current balance
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()
    const currentBalance = profile?.credit_balance ?? 0

    if (cost > 0 && currentBalance < cost) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût: ${cost} cr, solde: ${currentBalance} cr`,
        required: cost,
        available: currentBalance,
      }, { status: 402 })
    }

    const newBalance = currentBalance - cost

    if (cost > 0) {
      // Optimistic credit deduction
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', user.id)
        .eq('credit_balance', currentBalance) // race condition protection

      if (updateErr) {
        // Retry once with fresh balance
        const { data: fresh } = await supabaseAdmin
          .from('profiles').select('credit_balance').eq('id', user.id).single()
        const freshBalance = fresh?.credit_balance ?? 0
        if (freshBalance < cost) {
          return NextResponse.json({ error: 'Crédits insuffisants', required: cost, available: freshBalance }, { status: 402 })
        }
        await supabaseAdmin.from('profiles')
          .update({ credit_balance: freshBalance - cost }).eq('id', user.id)
      }

      // Log transaction
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id,
        amount: -cost,
        balance_after: newBalance,
        type: 'unlock',
        description: `Déverrouillage ${toUnlock.length} entreprise${toUnlock.length > 1 ? 's' : ''}`,
      })
    }

    // Record unlocks
    if (toUnlock.length > 0) {
      const rows = toUnlock.map(cid => ({
        user_id: user.id,
        company_id: cid,
        credits_spent: UNLOCK_COST_PER_COMPANY,
      }))
      const { error: unlockErr } = await supabaseAdmin
        .from('company_unlocks')
        .upsert(rows, { onConflict: 'user_id,company_id', ignoreDuplicates: true })

      if (unlockErr && unlockErr.code !== '23505') {
        console.error('Unlock insert error:', unlockErr)
        // Refund
        await supabaseAdmin.from('profiles')
          .update({ credit_balance: currentBalance }).eq('id', user.id)
        return NextResponse.json({ error: 'Erreur enregistrement' }, { status: 500 })
      }
    }

    // Fetch the full company data for the unlocked companies
    const allIds = companyIds // include already-unlocked ones too
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select(`
        id, telecontact_id, name, city, address_raw,
        phone_1, phone_2, phones, email, website,
        facebook, instagram, youtube, linkedin,
        ice, director, forme_juridique, capital, annee_creation, rc,
        latitude, longitude, activities, description,
        rating, review_count, is_recommended, logo_url, source_url
      `)
      .in('id', allIds)

    return NextResponse.json({
      success: true,
      creditsSpent: cost,
      newBalance: cost > 0 ? newBalance : currentBalance,
      alreadyUnlocked: alreadyUnlocked.size,
      newlyUnlocked: toUnlock.length,
      companies: companies ?? [],
    })
  } catch (e) {
    console.error('Unlock error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
