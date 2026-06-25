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
function completeness(c: Record<string,unknown>, fields: string[]) {
  return fields.reduce((s,f) => s + (hasData(c,f) ? 1 : 0), 0)
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

    // Always include basic
    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]

    // ── Fetch companies ──────────────────────────────────────
    let q = supabaseAdmin.from('companies').select(
      'id,name,city,annee_creation,forme_juridique,primary_sector,primary_domaine,' +
      'primary_activite,activities,phone_1,phone_2,email,website,director,' +
      'ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,' +
      'youtube,description,rating,logo_url'
    )

    if (sectors.length || domaines.length || activites.length) {
      const parts: string[] = []
      if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map((s:string)=>`"${s}"`).join(',')})`)
      if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map((s:string)=>`"${s}"`).join(',')})`)
      if (activites.length) parts.push(`primary_activite.in.(${activites.map((s:string)=>`"${s}"`).join(',')})`)
      q = q.or(parts.join(','))
    }
    if (cities.length) q = q.in('city', cities)
    if (name.trim())   q = q.ilike('name', `%${name.trim()}%`)
    if (capital_min && String(capital_min) !== '') q = q.gte('capital', String(capital_min))
    if (capital_max && String(capital_max) !== '') q = q.lte('capital', String(capital_max))

    const fetchLimit = Math.min(limit, 10000)
    const { data: raw, error: fetchErr } = await q.limit(fetchLimit * 3)
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const companies = (raw ?? []) as Record<string,unknown>[]
    // Best data first
    companies.sort((a,b) => completeness(b,allFields) - completeness(a,allFields))
    const selected = companies.slice(0, fetchLimit)
    if (!selected.length) return NextResponse.json({ error: 'Aucune entreprise trouvée' }, { status: 404 })

    const companyIds = selected.map(c => c.id as string)

    // ── Check existing unlocks ───────────────────────────────
    const { data: existingUnlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', user.id).in('company_id', companyIds).limit(10000)
    const unlockMap: Record<string,string[]> = {}
    for (const u of existingUnlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    // ── Smart cost calculation ───────────────────────────────
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
        error: `Crédits insuffisants. Coût: ${totalCost.toLocaleString('fr-FR')} cr, solde: ${balance.toLocaleString('fr-FR')} cr`,
        required: totalCost, available: balance,
      }, { status: 402 })
    }

    // ── STEP 1: Create query record FIRST to get queryId ────
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

    // ── STEP 2: Deduct credits ───────────────────────────────
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

    // ── STEP 3: Save company_unlocks WITH query_id + fields ──
    // Batch in chunks of 500 to avoid request size limits
    const chunkSize = 500
    for (let i = 0; i < selected.length; i += chunkSize) {
      const chunk = selected.slice(i, i + chunkSize)
      const rows = chunk.map(company => {
        const cid = company.id as string
        const existing = unlockMap[cid] ?? []
        const merged   = [...new Set([...existing, ...allFields])]
        return {
          user_id:       user.id,
          company_id:    cid,
          query_id:      queryId,      // ← Link to this specific search
          credits_spent: FIELD_GROUPS['basic'].cost,
          fields:        merged,       // ← Which fields are unlocked
          unlocked_at:   new Date().toISOString(),
        }
      })
      const { error: uErr } = await supabaseAdmin
        .from('company_unlocks')
        .upsert(rows, { onConflict: 'user_id,company_id' })
      if (uErr) console.error(`Unlock batch ${i}-${i+chunkSize} error:`, uErr)
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
