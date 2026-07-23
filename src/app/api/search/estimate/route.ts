export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'
import { countMatchingCompanies, fetchMatchingCompanies, type CompanyFilters } from '@/lib/companySearch'

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

    const filters: CompanyFilters = { sectors, domaines, activites, cities, name, effectifs: allEffectifs }
    const dataColumns = 'id,' + Object.values(FIELD_GROUPS).flatMap(f => f.columns).join(',') + ',effectif'

    // ── 1. Exact DB count — chunked queries, no URL-length risk regardless
    // of how many sectors/domaines/activités are selected ──
    const exactCount = await countMatchingCompanies(filters)

    // ── 2. Sample up to 500 rows for field-coverage estimation + capital ratio ──
    const rawSampleData = await fetchMatchingCompanies(filters, dataColumns, 500)
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
    const totalCount = Math.round(exactCount * capitalRatio)
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
