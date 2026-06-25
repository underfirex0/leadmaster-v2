export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { company_id, field } = await request.json()
    if (!company_id || !field) return NextResponse.json({ error: 'company_id + field requis' }, { status: 400 })

    const fieldDef = FIELD_GROUPS[field as FieldGroupId]
    if (!fieldDef) return NextResponse.json({ error: 'Champ invalide' }, { status: 400 })

    // Check if already unlocked
    const { data: existingUnlock } = await supabaseAdmin
      .from('company_unlocks').select('fields').eq('user_id', user.id).eq('company_id', company_id).single()

    const alreadyUnlocked = (existingUnlock?.fields as string[]) ?? []
    if (alreadyUnlocked.includes(field)) {
      // Already unlocked — just return the data
      const { data: company } = await supabaseAdmin.from('companies').select(fieldDef.columns.join(',')).eq('id', company_id).single()
      return NextResponse.json({ success: true, creditsSpent: 0, alreadyUnlocked: true, data: company })
    }

    // Check if company has this data
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id,' + fieldDef.columns.join(','))
      .eq('id', company_id).single()

    const hasData = fieldDef.columns.some(col => (company as Record<string,unknown>)?.[col] != null && (company as Record<string,unknown>)?.[col] !== '')

    if (!hasData) {
      return NextResponse.json({ success: false, error: 'Cette donnée n\'est pas disponible pour cette entreprise', noData: true })
    }

    // Check balance
    const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', user.id).single()
    const balance = profile?.credit_balance ?? 0
    if (balance < fieldDef.cost) {
      return NextResponse.json({ error: `Crédits insuffisants. Coût: ${fieldDef.cost} cr, solde: ${balance} cr`, required: fieldDef.cost, available: balance }, { status: 402 })
    }

    // Deduct credits
    const newBalance = balance - fieldDef.cost
    await supabaseAdmin.from('profiles').update({ credit_balance: newBalance }).eq('id', user.id)
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id, amount: -fieldDef.cost,
      balance_after: newBalance, type: 'unlock',
      description: `Déverrouillage ${fieldDef.label} — ${company_id.slice(0,8)}`,
    })

    // Update company_unlocks
    const newFields = [...new Set([...alreadyUnlocked, field])]
    await supabaseAdmin.from('company_unlocks').upsert({
      user_id: user.id, company_id,
      credits_spent: fieldDef.cost, fields: newFields,
    }, { onConflict: 'user_id,company_id' })

    return NextResponse.json({
      success: true, creditsSpent: fieldDef.cost, newBalance,
      field, data: company,
    })
  } catch (e) {
    console.error('Field unlock error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
