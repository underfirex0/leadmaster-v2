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

// Apply shared filters to any query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, { sectors, domaines, activites, cities, name, effectif, effectifs }: {
  sectors: string[]; domaines: string[]; activites: string[]
  cities: string[]; name: string; effectif?: string; effectifs?: string[]
}) {
  if (sectors.length || domaines.length || activites.length) {
    const parts: string[] = []
    if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map((s:string)=>`"${s}"`).join(',')})`)
    if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map((s:string)=>`"${s}"`).join(',')})`)
    if (activites.length) parts.push(`primary_activite.in.(${activites.map((s:string)=>`"${s}"`).join(',')})`)
    q = q.or(parts.join(','))
  }
  if (cities.length)  q = q.in('city', cities)
  if (name.trim())    q = q.ilike('name', `%${name.trim()}%`)
  // Multi-select effectif: use .in() for array, .eq() for single
  const allEffectifs = effectifs && effectifs.length > 0 ? effectifs : (effectif ? [effectif] : [])
  if (allEffectifs.length === 1) q = q.eq('effectif', allEffectifs[0])
  if (allEffectifs.length > 1)  q = q.in('effectif', allEffectifs)
  return q
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
    const dataColumns = 'id,' + Object.values(FIELD_GROUPS).flatMap(f => f.columns).join(',') + ',effectif'
    const filterArgs = { sectors, domaines, activites, cities, name, effectif, effectifs }

    // ── 1. Exact DB count (effectif is exact-match → perfectly accurate) ──
    // Capital is still filtered in-memory (TEXT numeric) → apply ratio after
    const { count: exactCount } = await applyFilters(
      supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
      filterArgs
    )

    // ── 2. Sample 500 rows for field-coverage estimation + capital ratio ──
    const { data: rawSample } = await applyFilters(
      supabaseAdmin.from('companies').select(dataColumns),
      filterArgs
    ).limit(500)

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

    // ── 4. Final count — effectif already exact, apply capital ratio on top ──
    const dbCount    = exactCount ?? rawSampleData.length
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
