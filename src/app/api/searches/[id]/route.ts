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

    const storedIds = (query.company_ids as string[] | null) ?? []
    const fields    = (query.fields_requested as string[]) ?? []

    let companyIds: string[] = storedIds

    // ── Fallback for old searches (no company_ids stored) ─────
    // Use company_unlocks ordered by unlock time near query creation
    if (!companyIds.length) {
      const queryCreatedAt = query.created_at as string
      const windowStart = new Date(new Date(queryCreatedAt).getTime() - 5 * 60_000).toISOString() // 5 min before
      const windowEnd   = new Date(new Date(queryCreatedAt).getTime() + 5 * 60_000).toISOString() // 5 min after

      const { data: nearUnlocks } = await supabaseAdmin
        .from('company_unlocks')
        .select('company_id')
        .eq('user_id', user.id)
        .gte('unlocked_at', windowStart)
        .lte('unlocked_at', windowEnd)
        .limit(query.result_count ?? 10000)

      companyIds = (nearUnlocks ?? []).map(u => u.company_id)

      // If still nothing, get the latest N unlocks
      if (!companyIds.length && (query.result_count ?? 0) > 0) {
        const { data: latestUnlocks } = await supabaseAdmin
          .from('company_unlocks')
          .select('company_id')
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
          .limit(query.result_count ?? 100)
        companyIds = (latestUnlocks ?? []).map(u => u.company_id)
      }
    }

    if (!companyIds.length) return NextResponse.json({ query, companies: [], fields })

    // ── Fetch companies ───────────────────────────────────────
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,activities,forme_juridique,phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description,rating')
      .in('id', companyIds)

    // ── Fetch unlock info ─────────────────────────────────────
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', user.id).in('company_id', companyIds)
    const unlockMap: Record<string, string[]> = {}
    for (const u of unlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    const enriched = (companies ?? []).map(c => ({
      ...c,
      // Backward compat: if has OLD fields (phone,email etc) but no 'basic',
      // treat as if 'basic' is also unlocked
      unlocked_fields: (() => {
        const uf = unlockMap[c.id] ?? []
        if (uf.length > 0 && !uf.includes('basic')) return [...uf, 'basic']
        return uf
      })(),
    }))

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
