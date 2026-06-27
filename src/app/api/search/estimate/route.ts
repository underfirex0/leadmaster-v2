export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

<<<<<<< HEAD
// Capital is TEXT — must parse before numeric comparison
=======
// Robust capital parser — handles "100 000", "100,000", "100000 MAD", etc.
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
function parseCapital(val: unknown): number {
  if (!val) return NaN
  const n = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.').replace(/\s/g, ''))
  return isNaN(n) ? NaN : n
}

<<<<<<< HEAD
// Apply shared filters to any query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, { sectors, domaines, activites, cities, name, effectif }: {
  sectors: string[]; domaines: string[]; activites: string[]
  cities: string[]; name: string; effectif?: string
=======
// Apply the same filter conditions to any Supabase query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, { sectors, domaines, activites, cities, name }: {
  sectors: string[]; domaines: string[]; activites: string[]; cities: string[]; name: string
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
}) {
  if (sectors.length || domaines.length || activites.length) {
    const parts: string[] = []
    if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map((s:string)=>`"${s}"`).join(',')})`)
    if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map((s:string)=>`"${s}"`).join(',')})`)
    if (activites.length) parts.push(`primary_activite.in.(${activites.map((s:string)=>`"${s}"`).join(',')})`)
    q = q.or(parts.join(','))
  }
<<<<<<< HEAD
  if (cities.length)  q = q.in('city', cities)
  if (name.trim())    q = q.ilike('name', `%${name.trim()}%`)
  // Effectif is an EXACT string value in DB — filter directly, no in-memory needed
  if (effectif)       q = q.eq('effectif', effectif)
=======
  if (cities.length) q = q.in('city', cities)
  if (name.trim())   q = q.ilike('name', `%${name.trim()}%`)
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
  return q
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const {
      sectors=[], domaines=[], activites=[], cities=[], name='',
<<<<<<< HEAD
      fields=['basic'], limit=50,
      capital_min, capital_max,
      effectif,                        // exact string e.g. "De 20 à 49 salariés"
    } = await request.json()

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const dataColumns = 'id,' + Object.values(FIELD_GROUPS).flatMap(f => f.columns).join(',') + ',effectif'
    const filterArgs = { sectors, domaines, activites, cities, name, effectif }

    // ── 1. Exact DB count (effectif is exact-match → perfectly accurate) ──
    // Capital is still filtered in-memory (TEXT numeric) → apply ratio after
=======
      fields=['basic'], limit=50, capital_min, capital_max,
    } = await request.json()

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const dataColumns = 'id,' + Object.values(FIELD_GROUPS).flatMap(f => f.columns).join(',')
    const filterArgs  = { sectors, domaines, activites, cities, name }

    // ── 1. Exact DB count (before capital filter — capital is TEXT, filtered in-memory) ──
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
    const { count: exactCount } = await applyFilters(
      supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
      filterArgs
    )

<<<<<<< HEAD
    // ── 2. Sample 500 rows for field-coverage estimation + capital ratio ──
=======
    // ── 2. Sample (max 500 rows) for field coverage + capital ratio ──
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
    const { data: rawSample } = await applyFilters(
      supabaseAdmin.from('companies').select(dataColumns),
      filterArgs
    ).limit(500)

    const rawSampleData = (rawSample ?? []) as Record<string, unknown>[]
    let sampleData = rawSampleData

<<<<<<< HEAD
    // ── 3. Capital in-memory filter (TEXT numeric — ratio estimation) ──
=======
    // ── 3. Capital in-memory filter + ratio estimation ──
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
    let capitalRatio = 1.0
    if (capital_min || capital_max) {
      const min = capital_min ? parseFloat(capital_min) : null
      const max = capital_max ? parseFloat(capital_max) : null
<<<<<<< HEAD
      sampleData = rawSampleData.filter(c => {
        const cap = parseCapital(c.capital)
        if (isNaN(cap)) return false
=======

      sampleData = rawSampleData.filter(c => {
        const cap = parseCapital(c.capital)
        if (isNaN(cap)) return false                       // exclude companies with no/invalid capital
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
        if (min !== null && cap < min) return false
        if (max !== null && cap > max) return false
        return true
      })
<<<<<<< HEAD
      capitalRatio = rawSampleData.length > 0 ? sampleData.length / rawSampleData.length : 0
    }

    // ── 4. Final count — effectif already exact, apply capital ratio on top ──
=======

      // Ratio of sample that passed the capital filter → apply to full DB count
      capitalRatio = rawSampleData.length > 0
        ? sampleData.length / rawSampleData.length
        : 0
    }

    // ── 4. Total count — DB count × capital ratio ──
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
    const dbCount    = exactCount ?? rawSampleData.length
    const totalCount = Math.round(dbCount * capitalRatio)
    const actualLimit = Math.min(limit, totalCount, 10000)

<<<<<<< HEAD
    // ── 5. Field coverage from filtered sample ──
=======
    // ── 5. Field coverage + estimated cost (from capital-filtered sample) ──
>>>>>>> 9efec50af4f5406788bf548159ce4ce7ac8c5467
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
      count:          totalCount,
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
