export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

const FIELD_COL = Object.fromEntries(
  Object.entries(FIELD_GROUPS).map(([k,v]) => [k, v.columns])
) as Record<string, string[]>

function hasData(c: Record<string,unknown>, field: string) {
  return (FIELD_COL[field] ?? []).some(col => c[col] != null && c[col] !== '')
}

// Completeness score: how many of the selected fields does this company have
function completeness(c: Record<string,unknown>, fields: string[]): number {
  return fields.reduce((s,f) => s + (hasData(c,f) ? 1 : 0), 0)
}

// Fetch all matching companies in batches of 1000 (Supabase row limit)
async function fetchAllMatching(
  baseFilters: {
    sectors: string[], domaines: string[], activites: string[],
    cities: string[], name: string, capital_min?: string, capital_max?: string
  },
  maxRows: number
): Promise<Record<string,unknown>[]> {
  const BATCH = 1000
  const all: Record<string,unknown>[] = []

  // We fetch up to maxRows * 2 to have better candidates for completeness sorting
  // but cap at 20k to avoid excessive DB calls
  const fetchTarget = Math.min(maxRows * 2, 20000)

  for (let offset = 0; offset < fetchTarget; offset += BATCH) {
    // Build fresh query each batch (Supabase query objects aren't reusable with range)
    let q = supabaseAdmin
      .from('companies')
      .select('id,name,city,annee_creation,forme_juridique,primary_sector,primary_domaine,' +
        'primary_activite,activities,phone_1,phone_2,email,website,director,' +
        'ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,' +
        'youtube,description,rating,logo_url')

    const { sectors, domaines, activites, cities, name, capital_min, capital_max } = baseFilters

    if (sectors.length || domaines.length || activites.length) {
      const parts: string[] = []
      if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map((s:string)=>`"${s}"`).join(',')})`)
      if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map((s:string)=>`"${s}"`).join(',')})`)
      if (activites.length) parts.push(`primary_activite.in.(${activites.map((s:string)=>`"${s}"`).join(',')})`)
      q = q.or(parts.join(','))
    }
    if (cities.length) q = q.in('city', cities)
    if (name.trim())   q = q.ilike('name', `%${name.trim()}%`)
    if (capital_min && capital_min !== '') q = q.gte('capital', capital_min)
    if (capital_max && capital_max !== '') q = q.lte('capital', capital_max)

    const { data: batch, error } = await q
      .range(offset, offset + BATCH - 1)
      .order('name')  // consistent ordering for pagination

    if (error) { console.error(`Batch ${offset} error:`, error); break }
    if (!batch?.length) break
    all.push(...batch)
    if (batch.length < BATCH) break // no more results
    if (all.length >= fetchTarget) break
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
    } = body

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const maxCompanies = Math.min(limit, 10000)

    // ── Fetch ALL matching companies in batches ──────────────
    const allRaw = await fetchAllMatching(
      { sectors, domaines, activites, cities, name,
        capital_min: capital_min ? String(capital_min) : undefined,
        capital_max: capital_max ? String(capital_max) : undefined,
      },
      maxCompanies
    )

    if (!allRaw.length) return NextResponse.json({ error: 'Aucune entreprise trouvée' }, { status: 404 })

    // ── Sort by completeness (companies with most data FIRST) ─
    // Primary: completeness for selected fields (descending)
    // Secondary: has phone (most important contact field)
    // Tertiary: has email
    allRaw.sort((a, b) => {
      const scoreA = completeness(a, allFields)
      const scoreB = completeness(b, allFields)
      if (scoreB !== scoreA) return scoreB - scoreA
      // Tiebreaker: prefer companies with phone
      const phoneA = hasData(a, 'phone') ? 1 : 0
      const phoneB = hasData(b, 'phone') ? 1 : 0
      if (phoneB !== phoneA) return phoneB - phoneA
      // Then email
      const emailA = hasData(a, 'email') ? 1 : 0
      const emailB = hasData(b, 'email') ? 1 : 0
      return emailB - emailA
    })

    const selected = allRaw.slice(0, maxCompanies)
    const companyIds = selected.map(c => c.id as string)

    // ── Check existing unlocks ───────────────────────────────
    const existingUnlocksAll: {company_id: string; fields: string[]}[] = []
    for (let i = 0; i < companyIds.length; i += 1000) {
      const chunk = companyIds.slice(i, i + 1000)
      const { data } = await supabaseAdmin
        .from('company_unlocks').select('company_id,fields')
        .eq('user_id', user.id).in('company_id', chunk)
      existingUnlocksAll.push(...(data ?? []))
    }
    const unlockMap: Record<string,string[]> = {}
    for (const u of existingUnlocksAll) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    // ── Smart cost: only charge for fields that have data ────
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance,free_trial_used').eq('id', user.id).single()
    const balance   = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false

    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrial   = !trialUsed && isBasicOnly && selected.length <= 100

    let totalCost = 0
    if (!freeTrial) {
      for (const company of selected) {
        const cid = company.id as string
        const already = unlockMap[cid] ?? []
        for (const field of allFields) {
          if (!already.includes(field) && hasData(company, field)) {
            totalCost += FIELD_GROUPS[field as FieldGroupId]?.cost ?? 0
          }
        }
      }
    }

    if (totalCost > balance) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût estimé: ${totalCost.toLocaleString('fr-FR')} cr, solde: ${balance.toLocaleString('fr-FR')} cr`,
        required: totalCost, available: balance,
      }, { status: 402 })
    }

    // ── Create query record FIRST ────────────────────────────
    const { data: queryRecord, error: qErr } = await supabaseAdmin
      .from('queries').insert({
        user_id:          user.id,
        filters:          { sectors, domaines, activites, cities, name, capital_min, capital_max },
        fields_requested: allFields,
        result_count:     selected.length,
        credits_spent:    totalCost,
      }).select('id').single()

    if (qErr || !queryRecord) {
      console.error('Query insert error:', qErr)
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
        return {
          user_id:       user.id,
          company_id:    cid,
          query_id:      queryId,
          credits_spent: FIELD_GROUPS['basic'].cost,
          fields:        merged,
          unlocked_at:   now,
        }
      })
      const { error: uErr } = await supabaseAdmin
        .from('company_unlocks')
        .upsert(rows, { onConflict: 'user_id,company_id' })
      if (uErr) console.error(`Unlock batch ${i} error:`, uErr)
    }

    return NextResponse.json({
      queryId,
      companiesUnlocked: selected.length,
      creditsSpent:      totalCost,
      newBalance:        balance - totalCost,
      freeTrialUsed:     freeTrial,
    })
  } catch (e) {
    console.error('Execute error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
