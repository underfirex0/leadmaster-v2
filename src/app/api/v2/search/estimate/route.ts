export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { countMatchingCompanies, fetchMatchingCompanies, type CompanyFiltersV2 } from '@/lib/companiesV2'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

// Column-name overrides for the two fields renamed in the v2 schema
const COLUMN_OVERRIDES: Record<string, string[]> = {
  effectif: ['effectif_tranche'],
  capital:  ['capital_mad'],
}
function columnsFor(field: FieldGroupId): string[] {
  return COLUMN_OVERRIDES[field] ?? FIELD_GROUPS[field].columns as unknown as string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const {
      taxonomyIds = [],
      cities = [],
      name = '',
      effectifTranches = [],
      capitalMin,
      capitalMax,
      fields = ['basic'],
      limit = 50,
    } = await request.json()

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const filters: CompanyFiltersV2 = { taxonomyIds, cities, name, effectifTranches, capitalMin, capitalMax }

    // ── 1. Exact count — real indexed query, fast even with many filters ──
    const exactCount = await countMatchingCompanies(filters)
    const actualLimit = Math.min(limit, exactCount, 10000)

    // ── 2. Sample up to 500 rows for field-coverage estimation ──
    const sampleCols = 'id,' + Object.values(FIELD_GROUPS).flatMap(g => columnsFor(g.id as FieldGroupId)).join(',')
    const sample = await fetchMatchingCompanies(filters, sampleCols, 500)

    const fieldCoverage: Record<string, number> = {}
    for (const field of allFields) {
      const cols = columnsFor(field)
      const covered = sample.filter(c => cols.some(col => c[col] != null && c[col] !== '')).length
      fieldCoverage[field] = sample.length > 0 ? Math.round((covered / sample.length) * 100) : 70
    }

    // ── 3. Cost calculation from real coverage rates ──
    let estimatedCost = 0
    for (const field of allFields) {
      const rate = fieldCoverage[field] / 100
      estimatedCost += Math.round(rate * actualLimit * FIELD_GROUPS[field].cost)
    }

    // ── 4. Balance + free trial ──
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance,free_trial_used').eq('id', user.id).single()
    const balance   = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrialEligible = !trialUsed && isBasicOnly && actualLimit <= 100

    return NextResponse.json({
      count: exactCount,
      actualLimit,
      estimatedCost: freeTrialEligible ? 0 : estimatedCost,
      fieldCoverage,
      canAfford: balance >= estimatedCost || freeTrialEligible,
      balance,
      freeTrialEligible,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('Estimate v2 error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
