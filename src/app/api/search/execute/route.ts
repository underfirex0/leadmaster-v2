export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

const FIELD_COL = Object.fromEntries(
  Object.entries(FIELD_GROUPS).map(([k,v]) => [k, v.columns])
) as Record<string, string[]>

// All possible contact columns — used for global completeness scoring
const ALL_CONTACT_COLS = [
  'phone_1','phone_2','email','website','director',
  'ice','rc','capital','address_raw','facebook','instagram',
  'linkedin','annee_creation','forme_juridique','description'
]

function hasData(c: Record<string,unknown>, field: string) {
  return (FIELD_COL[field] ?? []).some(col => c[col] != null && c[col] !== '')
}

// Selected-field completeness (for pricing accuracy)
function selectedCompleteness(c: Record<string,unknown>, fields: string[]): number {
  return fields.reduce((s,f) => s + (hasData(c,f) ? 1 : 0), 0)
}

// Global completeness across ALL fields (for display quality — fewer "Non disponible")
function globalCompleteness(c: Record<string,unknown>): number {
  return ALL_CONTACT_COLS.reduce((s, col) =>
    s + (c[col] != null && c[col] !== '' ? 1 : 0), 0)
}

// Parse capital value from text (handles "100 000", "1,000,000", "100000 MAD" etc.)
function parseCapital(val: unknown): number {
  if (!val) return NaN
  const n = parseFloat(String(val).replace(/[^0-9.,]/g,'').replace(',','.').replace(/\s/g,''))
  return isNaN(n) ? NaN : n
}

async function fetchAllMatching(
  filters: {
    sectors: string[], domaines: string[], activites: string[],
    cities: string[], name: string,
    capital_min?: string, capital_max?: string,
    effectif?: string,
  },
  targetRows: number
): Promise<Record<string,unknown>[]> {
  const BATCH = 1000
  const all: Record<string,unknown>[] = []
  // We fetch 2× target to have better candidates for completeness sorting
  const fetchTarget = Math.min(targetRows * 2, 20000)

  for (let offset = 0; offset < fetchTarget; offset += BATCH) {
    let q = supabaseAdmin
      .from('companies')
      .select('id,name,city,annee_creation,forme_juridique,primary_sector,primary_domaine,' +
        'primary_activite,activities,phone_1,phone_2,email,website,director,' +
        'ice,rc,capital,effectif,address_raw,latitude,longitude,facebook,instagram,linkedin,' +
        'youtube,description,rating,logo_url')

    const { sectors, domaines, activites, cities, name } = filters

    if (sectors.length || domaines.length || activites.length) {
      const parts: string[] = []
      if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map(s=>`"${s}"`).join(',')})`)
      if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map(s=>`"${s}"`).join(',')})`)
      if (activites.length) parts.push(`primary_activite.in.(${activites.map(s=>`"${s}"`).join(',')})`)
      q = q.or(parts.join(','))
    }
    if (cities.length)     q = q.in('city', cities)
    if (name.trim())       q = q.ilike('name', `%${name.trim()}%`)
    if (filters.effectif)  q = q.eq('effectif', filters.effectif)

    const { data: batch, error } = await q.range(offset, offset + BATCH - 1).order('name')
    if (error) { console.error(`Batch ${offset} error:`, error); break }
    if (!batch?.length) break
    all.push(...batch)
    if (batch.length < BATCH) break
    if (all.length >= fetchTarget) break
  }

  // In-memory capital filter (capital is TEXT in DB, so numeric comparison must be in-memory)
  const { capital_min, capital_max } = filters
  if (capital_min || capital_max) {
    const min = capital_min ? parseFloat(capital_min) : null
    const max = capital_max ? parseFloat(capital_max) : null
    return all.filter(c => {
      const cap = parseCapital(c.capital)
      if (isNaN(cap)) return false
      if (min !== null && cap < min) return false
      if (max !== null && cap > max) return false
      return true
    })
  }

  return all
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const {
      sectors=[], domaines=[], activites=[],
      cities=[], name='',
      fields=[] as string[],
      limit=50,
      capital_min, capital_max,
      effectif,
    } = body

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const maxCompanies = Math.min(limit, 10000)

    // ── Fetch ALL matching companies in batches ──────────────
    const allRaw = await fetchAllMatching(
      { sectors, domaines, activites, cities, name,
        capital_min: capital_min ? String(capital_min) : undefined,
        capital_max: capital_max ? String(capital_max) : undefined,
        effectif: effectif || undefined,
      },
      maxCompanies
    )

    if (!allRaw.length) return NextResponse.json({ error: 'Aucune entreprise trouvée avec ces critères' }, { status: 404 })

    // ── Sort: best global data quality FIRST ────────────────
    // Primary: selected-field completeness (most relevant to user's choice)
    // Secondary: GLOBAL completeness (fewer "Non disponible" shown to user)
    // This ensures user always sees richest companies first, regardless of what they selected
    allRaw.sort((a, b) => {
      const selA = selectedCompleteness(a, allFields)
      const selB = selectedCompleteness(b, allFields)
      if (selB !== selA) return selB - selA
      return globalCompleteness(b) - globalCompleteness(a)
    })

    const selected = allRaw.slice(0, maxCompanies)
    const companyIds = selected.map(c => c.id as string)

    // ── Check existing unlocks ───────────────────────────────
    const existingAll: {company_id: string; fields: string[]}[] = []
    for (let i = 0; i < companyIds.length; i += 1000) {
      const { data } = await supabaseAdmin
        .from('company_unlocks').select('company_id,fields')
        .eq('user_id', user.id).in('company_id', companyIds.slice(i, i+1000))
      existingAll.push(...(data ?? []))
    }
    const unlockMap: Record<string,string[]> = {}
    for (const u of existingAll) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    // ── Smart cost calculation ───────────────────────────────
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
            const fieldCost = FIELD_GROUPS[field as FieldGroupId]?.cost ?? 0
            totalCost += fieldCost
            companyCost += fieldCost
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

    // ── Create query record FIRST ────────────────────────────
    const { data: queryRecord, error: qErr } = await supabaseAdmin
      .from('queries').insert({
        user_id:          user.id,
        filters:          { sectors, domaines, activites, cities, name, capital_min, capital_max, effectif: effectif||undefined },
        fields_requested: allFields,
        result_count:     selected.length,
        credits_spent:    totalCost,
      }).select('id').single()

    if (qErr || !queryRecord) {
      return NextResponse.json({ error: 'Erreur création recherche: ' + (qErr?.message ?? 'unknown') }, { status: 500 })
    }
    const queryId = queryRecord.id

    // ── Deduct credits ───────────────────────────────────────
    if (totalCost > 0) {
      await supabaseAdmin.from('profiles')
        .update({ credit_balance: balance - totalCost }).eq('id', user.id)
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id, amount: -totalCost,
        balance_after: balance - totalCost, type: 'unlock',
        description: `Recherche ${queryId.slice(0,8)}: ${selected.length} entreprises`,
      })
    }
    if (freeTrial) {
      await supabaseAdmin.from('profiles').update({ free_trial_used: true }).eq('id', user.id)
    }

    // ── Save company_unlocks in batches of 500 ───────────────
    const now = new Date().toISOString()
    for (let i = 0; i < selected.length; i += 500) {
      const chunk = selected.slice(i, i + 500)
      const rows = chunk.map(company => {
        const cid = company.id as string
        const existing = unlockMap[cid] ?? []
        const merged   = [...new Set([...existing, ...allFields])]
        return { user_id: user.id, company_id: cid, query_id: queryId,
                 credits_spent: companyCostMap[cid] ?? FIELD_GROUPS['basic'].cost, fields: merged, unlocked_at: now }
      })
      await supabaseAdmin.from('company_unlocks')
        .upsert(rows, { onConflict: 'user_id,company_id' })
    }

    return NextResponse.json({
      queryId, companiesUnlocked: selected.length,
      creditsSpent: totalCost, newBalance: balance - totalCost, freeTrialUsed: freeTrial,
    })
  } catch (e) {
    console.error('Execute error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
