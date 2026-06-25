export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: query } = await supabaseAdmin
      .from('queries').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (!query) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const fields = (query.fields_requested as string[]) ?? []

    // ── Get company IDs — try all possible storage locations ──
    const filters = (query.filters as Record<string, unknown>) ?? {}

    let companyIds: string[] =
      // 1. New format: stored in filters._company_ids
      (filters._company_ids as string[] | undefined) ??
      // 2. Old format: stored in separate company_ids column (if migration was run)
      ((query as Record<string, unknown>).company_ids as string[] | undefined) ??
      []

    // ── Fallback: find unlocks created around the same time as this query ──
    if (!companyIds.length && (query.result_count ?? 0) > 0) {
      const createdAt = new Date(query.created_at as string)
      const windowStart = new Date(createdAt.getTime() - 10 * 60_000).toISOString() // 10 min before
      const windowEnd   = new Date(createdAt.getTime() + 2  * 60_000).toISOString() // 2 min after

      const { data: nearUnlocks } = await supabaseAdmin
        .from('company_unlocks')
        .select('company_id, unlocked_at')
        .eq('user_id', user.id)
        .gte('unlocked_at', windowStart)
        .lte('unlocked_at', windowEnd)
        .order('unlocked_at', { ascending: false })
        .limit(query.result_count as number ?? 10000)

      companyIds = (nearUnlocks ?? []).map(u => u.company_id as string)
    }

    // ── Last resort: latest N unlocks ────────────────────────
    if (!companyIds.length && (query.result_count ?? 0) > 0) {
      const { data: latest } = await supabaseAdmin
        .from('company_unlocks')
        .select('company_id')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(query.result_count as number ?? 100)
      companyIds = (latest ?? []).map(u => u.company_id as string)
    }

    if (!companyIds.length) return NextResponse.json({ query, companies: [], fields })

    // ── Fetch companies ───────────────────────────────────────
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,activities,forme_juridique,phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description,rating')
      .in('id', companyIds)

    // ── Fetch unlock info + backward compat ───────────────────
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', user.id).in('company_id', companyIds)
    const unlockMap: Record<string, string[]> = {}
    for (const u of unlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    const enriched = (companies ?? []).map(c => {
      const uf = unlockMap[c.id] ?? []
      // Backward compat: old unlocks don't have 'basic' — treat as if they do
      const unlockedFields = uf.length > 0 && !uf.includes('basic') ? [...uf, 'basic'] : uf
      return { ...c, unlocked_fields: unlockedFields }
    })

    return NextResponse.json({ query, companies: enriched, fields })
  } catch (e) {
    console.error('Searches detail error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    await supabaseAdmin.from('queries').delete().eq('id', params.id).eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }) }
}
