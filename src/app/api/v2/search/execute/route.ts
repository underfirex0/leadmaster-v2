export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchMatchingCompanies, type CompanyFiltersV2 } from '@/lib/companiesV2'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

const COLUMN_OVERRIDES: Record<string, string[]> = {
  basic:     ['name', 'city', 'forme_juridique'],
  effectif:  ['effectif_tranche'],
  capital:   ['capital_mad'],
}
function columnsFor(field: FieldGroupId): string[] {
  return COLUMN_OVERRIDES[field] ?? FIELD_GROUPS[field].columns as unknown as string[]
}
function hasData(c: Record<string, unknown>, field: FieldGroupId): boolean {
  return columnsFor(field).some(col => c[col] != null && c[col] !== '')
}

const ALL_CONTACT_COLS = [
  'phone_1','phone_2','email','website','director','ice','rc',
  'capital_mad','address_raw','annee_creation','forme_juridique',
]
function globalCompleteness(c: Record<string, unknown>): number {
  return ALL_CONTACT_COLS.reduce((s, col) => s + (c[col] != null && c[col] !== '' ? 1 : 0), 0)
}

const DATA_COLUMNS = 'id,telecontact_id,name,city,address_raw,phone_1,phone_2,email,website,' +
  'ice,rc,director,forme_juridique,capital_mad,annee_creation,effectif_tranche,' +
  'primary_taxonomy_id,latitude,longitude,description'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const {
      taxonomyIds = [], cities = [], name = '',
      effectifTranches = [], capitalMin, capitalMax,
      fields = [], limit = 50, queryName,
    } = body

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const maxCompanies = Math.min(limit, 10000)
    const filters: CompanyFiltersV2 = { taxonomyIds, cities, name, effectifTranches, capitalMin, capitalMax }

    const fetchTarget = Math.min(maxCompanies * 2, 20000)
    const allRaw = await fetchMatchingCompanies(filters, DATA_COLUMNS, fetchTarget)

    if (!allRaw.length) {
      return NextResponse.json({ error: 'Aucune entreprise trouvée avec ces critères' }, { status: 404 })
    }

    // Sort: best data quality first (selected-field completeness, then global)
    allRaw.sort((a, b) => {
      const selA = allFields.reduce((s,f) => s + (hasData(a,f)?1:0), 0)
      const selB = allFields.reduce((s,f) => s + (hasData(b,f)?1:0), 0)
      if (selB !== selA) return selB - selA
      return globalCompleteness(b) - globalCompleteness(a)
    })

    const selected = allRaw.slice(0, maxCompanies)
    const companyIds = selected.map(c => c.id as string)

    // ── Existing unlocks — company_unlocks still references the same
    // UUIDs, since companies_v2.id preserves the original company ids ──
    const existingAll: { company_id: string; fields: string[] }[] = []
    for (let i = 0; i < companyIds.length; i += 1000) {
      const { data } = await supabaseAdmin
        .from('company_unlocks').select('company_id,fields')
        .eq('user_id', user.id).in('company_id', companyIds.slice(i, i+1000))
      existingAll.push(...(data ?? []))
    }
    const unlockMap: Record<string, string[]> = {}
    for (const u of existingAll) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance,free_trial_used').eq('id', user.id).single()
    const balance   = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrial   = !trialUsed && isBasicOnly && selected.length <= 100

    let totalCost = 0
    const companyCostMap: Record<string, number> = {}
    if (!freeTrial) {
      for (const company of selected) {
        const cid = company.id as string
        const already = unlockMap[cid] ?? []
        let companyCost = 0
        for (const field of allFields) {
          if (!already.includes(field) && hasData(company, field)) {
            const c = FIELD_GROUPS[field].cost
            totalCost += c
            companyCost += c
          }
        }
        companyCostMap[cid] = companyCost
      }
    }

    if (totalCost > balance) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût: ${totalCost.toLocaleString('fr-FR')} cr, solde: ${balance.toLocaleString('fr-FR')} cr`,
        required: totalCost, available: balance,
      }, { status: 402 })
    }

    const { data: queryRecord, error: qErr } = await supabaseAdmin
      .from('queries').insert({
        user_id: user.id,
        query_name: queryName?.trim() || null,
        filters: { taxonomyIds, cities, name, effectifTranches, capitalMin, capitalMax },
        fields_requested: allFields,
        result_count: selected.length,
        credits_spent: totalCost,
      }).select('id').single()

    if (qErr || !queryRecord) {
      return NextResponse.json({ error: 'Erreur création recherche: ' + (qErr?.message ?? '') }, { status: 500 })
    }
    const queryId = queryRecord.id

    if (totalCost > 0) {
      await supabaseAdmin.from('profiles').update({ credit_balance: balance - totalCost }).eq('id', user.id)
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id, amount: -totalCost, balance_after: balance - totalCost, type: 'unlock',
        description: `Recherche ${queryId.slice(0,8)}: ${selected.length} entreprises`,
      })
    }
    if (freeTrial) {
      await supabaseAdmin.from('profiles').update({ free_trial_used: true }).eq('id', user.id)
    }

    const now = new Date().toISOString()
    for (let i = 0; i < selected.length; i += 500) {
      const batch = selected.slice(i, i + 500)
      const rows = batch.map(company => {
        const cid = company.id as string
        const merged = [...new Set([...(unlockMap[cid] ?? []), ...allFields])]
        return { user_id: user.id, company_id: cid, query_id: queryId,
                 credits_spent: companyCostMap[cid] ?? FIELD_GROUPS.basic.cost, fields: merged, unlocked_at: now }
      })
      await supabaseAdmin.from('company_unlocks').upsert(rows, { onConflict: 'user_id,company_id' })
    }

    return NextResponse.json({
      queryId, companiesUnlocked: selected.length,
      creditsSpent: totalCost, newBalance: balance - totalCost, freeTrialUsed: freeTrial,
    })
  } catch (e) {
    console.error('Execute v2 error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
