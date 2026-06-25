export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
type P = { params: { id: string } }

export async function GET(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: query } = await supabaseAdmin
      .from('queries').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (!query) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const fields = (query.fields_requested as string[]) ?? []

    // ── PRIMARY: Get company IDs via query_id on company_unlocks ──
    // This is the most reliable method — works for any number of companies
    const { data: unlocksByQuery, error: unlockErr } = await supabaseAdmin
      .from('company_unlocks')
      .select('company_id, fields')
      .eq('user_id', user.id)
      .eq('query_id', params.id)
      .limit(10000)

    let companyIds: string[] = []
    const unlockFieldsMap: Record<string, string[]> = {}

    if (!unlockErr && unlocksByQuery?.length) {
      // Found unlocks linked to this query ✅
      for (const u of unlocksByQuery) {
        companyIds.push(u.company_id)
        unlockFieldsMap[u.company_id] = (u.fields as string[]) ?? []
      }
    } else {
      // ── FALLBACK 1: Time window around query creation ─────
      const createdAt = new Date(query.created_at as string)
      const windowStart = new Date(createdAt.getTime() - 10 * 60_000).toISOString()
      const windowEnd   = new Date(createdAt.getTime() + 5  * 60_000).toISOString()

      const { data: timeUnlocks } = await supabaseAdmin
        .from('company_unlocks')
        .select('company_id, fields, unlocked_at')
        .eq('user_id', user.id)
        .gte('unlocked_at', windowStart)
        .lte('unlocked_at', windowEnd)
        .limit(query.result_count as number ?? 10000)

      if (timeUnlocks?.length) {
        for (const u of timeUnlocks) {
          companyIds.push(u.company_id)
          unlockFieldsMap[u.company_id] = (u.fields as string[]) ?? []
        }
      } else {
        // ── FALLBACK 2: Latest N unlocks ──────────────────────
        const { data: latestUnlocks } = await supabaseAdmin
          .from('company_unlocks')
          .select('company_id, fields')
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
          .limit(query.result_count as number ?? 100)

        for (const u of latestUnlocks ?? []) {
          companyIds.push(u.company_id)
          unlockFieldsMap[u.company_id] = (u.fields as string[]) ?? []
        }
      }
    }

    if (!companyIds.length) return NextResponse.json({ query, companies: [], fields })

    // ── Fetch companies in chunks (handles >1000 safely) ────
    const allCompanies: Record<string,unknown>[] = []
    const chunkSize = 500
    for (let i = 0; i < companyIds.length; i += chunkSize) {
      const chunk = companyIds.slice(i, i + chunkSize)
      const { data, error: cErr } = await supabaseAdmin
        .from('companies')
        .select('id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,activities,forme_juridique,phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description,rating')
        .in('id', chunk)
        .limit(chunkSize)
      if (cErr) { console.error('Companies fetch error:', cErr); continue }
      allCompanies.push(...(data ?? []))
    }

    // ── Enrich with unlocked_fields ──────────────────────────
    const enriched = allCompanies.map(c => {
      const cid = c.id as string
      let uf = unlockFieldsMap[cid] ?? []
      // Backward compat: old unlocks without 'basic' → treat as having basic
      if (uf.length > 0 && !uf.includes('basic')) uf = [...uf, 'basic']
      return { ...c, unlocked_fields: uf }
    })

    return NextResponse.json({ query, companies: enriched, fields })
  } catch (e) {
    console.error('Searches detail error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    await supabaseAdmin.from('queries').delete().eq('id', params.id).eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }) }
}
