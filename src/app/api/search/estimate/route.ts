export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

// Capital is TEXT — must parse before numeric comparison
function parseCapital(val: unknown): number {
  if (!val) return NaN
  const n = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.').replace(/\s/g, ''))
  return isNaN(n) ? NaN : n
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const {
      sectors=[], domaines=[], activites=[], cities=[], name='',
      fields=['basic'], limit=50,
      capital_min, capital_max,
      effectif,    // single value (legacy)
      effectifs,   // multi-select array (new)
    } = await request.json()

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const allEffectifs: string[] = effectifs?.length > 0 ? effectifs : (effectif ? [effectif] : [])

    // ── RPC-based filtering — arrays travel in the POST body, not the
    // URL, so there's no practical limit on how many sectors/domaines/
    // activités/cities can be selected at once (previously a giant
    // .or()/.in() filter string built the whole thing into the URL query
    // string, which silently broke and returned 0 rows past a certain
    // size — see fix_search_url_limit_and_uncategorized.sql for details).
    const rpcArgs = {
      p_sectors:   sectors,
      p_domaines:  domaines,
      p_activites: activites,
      p_cities:    cities,
      p_name:      name,
      p_effectifs: allEffectifs,
    }

    // ── 1. Exact DB count ──
    const { data: exactCount, error: countErr } = await supabaseAdmin.rpc('count_companies_matching', rpcArgs)
    if (countErr) throw countErr

    // ── 2. Sample 500 rows for field-coverage estimation + capital ratio ──
    const { data: rawSample, error: sampleErr } = await supabaseAdmin.rpc('fetch_companies_matching', {
      ...rpcArgs, p_limit: 500, p_offset: 0,
    })
    if (sampleErr) throw sampleErr

    const rawSampleData = (rawSample ?? []) as Record<string, unknown>[]
    let sampleData = rawSampleData

    // ── 3. Capital in-memory filter (TEXT numeric — ratio estimation) ──
    let capitalRatio = 1.0
    if (capital_min || capital_max) {
      const min = capital_min ? parseFloat(capital_min) : null
      const max = capital_max ? parseFloat(capital_max) : null
      sampleData = rawSampleData.filter(c => {
        const cap = parseCapital(c.capital)
        if (isNaN(cap)) return false
        if (min !== null && cap < min) return false
        if (max !== null && cap > max) return false
        return true
      })
      capitalRatio = rawSampleData.length > 0 ? sampleData.length / rawSampleData.length : 0
    }

    // ── 4. Final count — apply capital ratio on top of exact DB count ──
    const dbCount    = Number(exactCount ?? rawSampleData.length)
    const totalCount = Math.round(dbCount * capitalRatio)
    const actualLimit = Math.min(limit, totalCount, 10000)

    // ── 5. Field coverage from filtered sample ──
    const fieldCoverage: Record<string, number> = {}
    const fieldCounts:   Record<string, number> = {}

    for (const field of allFields) {
      const cols = FIELD_GROUPS[field]?.columns ?? []
      const covered = sampleData.filter(c => cols.some(col => c[col] != null && c[col] !== '')).length
      const rate = sampleData.length > 0 ? covered / sampleData.length : 0.7
      fieldCoverage[field] = Math.round(rate * 100)
      fieldCounts[field]   = Math.round(rate * actualLimit)
    }

    let estimatedCost = 0
    for (const field of allFields) {
      const rate = fieldCoverage[field] / 100
      estimatedCost += Math.round(rate * actualLimit * (FIELD_GROUPS[field as FieldGroupId]?.cost ?? 0))
    }

    // ── 6. User balance + free trial ──
    const { data: profile } = await supabaseAdmin.from('profiles')
      .select('credit_balance,free_trial_used').eq('id', user.id).single()
    const balance   = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrialEligible = !trialUsed && isBasicOnly && actualLimit <= 100

    return NextResponse.json({
      count: totalCount,
      actualLimit,
      estimatedCost:  freeTrialEligible ? 0 : estimatedCost,
      fieldCoverage,
      fieldCounts,
      canAfford:      balance >= estimatedCost || freeTrialEligible,
      balance,
      freeTrialEligible,
    })
  } catch (e) {
    console.error('Estimate error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
