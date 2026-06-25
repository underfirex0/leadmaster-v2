export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { sectors=[], domaines=[], activites=[], cities=[], name='', fields=['basic'], limit=50, capital_min, capital_max } = await request.json()

    // Build count query
    let q = supabaseAdmin.from('companies').select('id,phone_1,email,website,director,ice,annee_creation,capital,address_raw,facebook', { count: 'exact' })

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
    if (capital_min)   q = q.gte('capital', String(capital_min))
    if (capital_max)   q = q.lte('capital', String(capital_max))

    const { data: sample, count } = await q.limit(Math.min(limit * 2, 500))
    const totalCount = count ?? 0
    const actualLimit = Math.min(limit, totalCount, 10000)

    // Estimate smart cost: sample N companies and extrapolate field coverage
    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const sampleCompanies = (sample ?? []) as Record<string, unknown>[]

    const fieldCoverage: Record<string, number> = {}
    for (const field of allFields) {
      const cols = FIELD_GROUPS[field as FieldGroupId]?.columns ?? []
      const covered = sampleCompanies.filter(c => cols.some(col => c[col] != null && c[col] !== '')).length
      fieldCoverage[field] = sampleCompanies.length > 0 ? covered / sampleCompanies.length : 0.7 // default 70%
    }

    // Estimated cost = for each field: coverage_rate × count × field_cost
    let estimatedCost = 0
    const costByField: Record<string, number> = {}
    for (const field of allFields) {
      const coverage = fieldCoverage[field] ?? 0.7
      const fieldCost = FIELD_GROUPS[field as FieldGroupId]?.cost ?? 0
      const est = Math.round(coverage * actualLimit * fieldCost)
      costByField[field] = est
      estimatedCost += est
    }

    // Check user balance
    const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance,free_trial_used').eq('id', user.id).single()
    const balance = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrialEligible = !trialUsed && isBasicOnly && actualLimit <= 100

    if (freeTrialEligible) estimatedCost = 0

    return NextResponse.json({
      count: totalCount,
      actualLimit,
      estimatedCost,
      costByField,
      fieldCoverage,
      canAfford: balance >= estimatedCost || freeTrialEligible,
      balance,
      freeTrialEligible,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
