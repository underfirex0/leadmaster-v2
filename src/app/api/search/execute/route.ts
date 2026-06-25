export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

const FIELD_COL = Object.fromEntries(
  Object.entries(FIELD_GROUPS).map(([k, v]) => [k, v.columns])
) as Record<string, string[]>

function hasData(company: Record<string, unknown>, field: string): boolean {
  const cols = FIELD_COL[field] ?? []
  return cols.some(col => company[col] != null && company[col] !== '')
}

function completenessScore(company: Record<string, unknown>, fields: string[]): number {
  return fields.reduce((s, f) => s + (hasData(company, f) ? 1 : 0), 0)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const {
      sectors = [], domaines = [], activites = [],
      cities = [], name = '',
      fields = ['basic'] as string[],
      limit = 50,
      capital_min, capital_max,
    } = body

    // Always include 'basic' (first unlock of a company always charges for basic)
    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]

    if (allFields.length === 0) return NextResponse.json({ error: 'Sélectionnez au moins un champ' }, { status: 400 })

    // ── Fetch companies matching filters ─────────────────────
    const FETCH_COLS = 'id,name,city,annee_creation,forme_juridique,primary_sector,primary_domaine,primary_activite,activities,phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,description,rating,review_count,is_recommended,logo_url'

    let q = supabaseAdmin.from('companies').select(FETCH_COLS)

    const hasNomen = sectors.length || domaines.length || activites.length
    if (hasNomen) {
      const parts: string[] = []
      if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map((s: string) => `"${s}"`).join(',')})`)
      if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map((s: string) => `"${s}"`).join(',')})`)
      if (activites.length) parts.push(`primary_activite.in.(${activites.map((s: string) => `"${s}"`).join(',')})`)
      q = q.or(parts.join(','))
    }
    if (cities.length) q = q.in('city', cities)
    if (name.trim())   q = q.ilike('name', `%${name.trim()}%`)
    if (capital_min && String(capital_min) !== '')   q = q.gte('capital', String(capital_min))
    if (capital_max && String(capital_max) !== '')   q = q.lte('capital', String(capital_max))

    const { data: rawCompanies, error: fetchErr } = await q.limit(Math.min(limit, 10000) * 3)
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const companies = (rawCompanies ?? []) as Record<string, unknown>[]

    // Sort: best completeness for selected fields FIRST
    companies.sort((a, b) => completenessScore(b, allFields) - completenessScore(a, allFields))
    const selected = companies.slice(0, Math.min(limit, 10000))
    if (!selected.length) return NextResponse.json({ error: 'Aucune entreprise trouvée' }, { status: 404 })

    const companyIds = selected.map(c => c.id as string)

    // ── Check existing unlocks ────────────────────────────────
    const { data: existingUnlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', user.id).in('company_id', companyIds)
    const unlockMap: Record<string, string[]> = {}
    for (const u of existingUnlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    // ── Get user profile ──────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance,free_trial_used').eq('id', user.id).single()
    const balance = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false

    // ── Free trial check ──────────────────────────────────────
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrialEligible = !trialUsed && isBasicOnly && selected.length <= 100

    // ── Smart cost calculation ────────────────────────────────
    // Only charge for fields that:
    // 1. Are not already unlocked for this company
    // 2. Actually have data in this company
    let totalCost = 0
    const costBreakdown: Record<string, number> = {}

    if (!freeTrialEligible) {
      for (const company of selected) {
        const cid = company.id as string
        const alreadyUnlocked = unlockMap[cid] ?? []

        for (const field of allFields) {
          if (alreadyUnlocked.includes(field)) continue // Already paid
          // Only charge if company actually has this data
          if (hasData(company, field)) {
            const cost = FIELD_GROUPS[field]?.cost ?? 0
            totalCost += cost
            costBreakdown[field] = (costBreakdown[field] ?? 0) + 1
          }
        }
      }
    }

    if (totalCost > balance) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût: ${totalCost.toLocaleString('fr-FR')} cr, solde: ${balance.toLocaleString('fr-FR')} cr`,
        required: totalCost, available: balance, breakdown: costBreakdown,
      }, { status: 402 })
    }

    // ── Deduct credits ────────────────────────────────────────
    if (totalCost > 0) {
      await supabaseAdmin.from('profiles')
        .update({ credit_balance: balance - totalCost }).eq('id', user.id)
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id, amount: -totalCost,
        balance_after: balance - totalCost, type: 'unlock',
        description: `${selected.length} entreprises · ${allFields.join(', ')}`,
      })
    }

    // Mark free trial used
    if (freeTrialEligible) {
      await supabaseAdmin.from('profiles').update({ free_trial_used: true }).eq('id', user.id)
    }

    // ── Save company_unlocks ──────────────────────────────────
    const unlockRows = selected.map(company => {
      const cid = company.id as string
      const existing = unlockMap[cid] ?? []
      const merged = [...new Set([...existing, ...allFields])]
      return { user_id: user.id, company_id: cid, credits_spent: FIELD_GROUPS['basic'].cost, fields: merged }
    })
    await supabaseAdmin.from('company_unlocks')
      .upsert(unlockRows, { onConflict: 'user_id,company_id' })

    // ── Save query — store company_ids inside filters JSONB (no migration needed) ──
    const { data: queryRecord, error: qErr } = await supabaseAdmin.from('queries').insert({
      user_id:          user.id,
      filters:          { sectors, domaines, activites, cities, name, capital_min, capital_max, _company_ids: companyIds },
      fields_requested: allFields,
      result_count:     selected.length,
      credits_spent:    totalCost,
    }).select().single()

    if (qErr) console.error('Query save error (non-blocking):', qErr)

    return NextResponse.json({
      queryId:           queryRecord?.id ?? null,
      companiesUnlocked: selected.length,
      creditsSpent:      totalCost,
      newBalance:        balance - totalCost,
      freeTrialUsed:     freeTrialEligible,
      breakdown:         costBreakdown,
    })
  } catch (e) {
    console.error('Execute error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
