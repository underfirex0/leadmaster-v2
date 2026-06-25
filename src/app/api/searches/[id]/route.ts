export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
type P = { params: { id: string } }

const BATCH = 500

// Paginate any query using .range() to bypass Supabase's 1000 row cap
async function fetchAllWithRange(
  buildQuery: (offset: number, end: number) => ReturnType<typeof supabaseAdmin.from>
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let offset = 0
  while (true) {
    const { data, error } = await buildQuery(offset, offset + BATCH - 1) as unknown as { data: Record<string,unknown>[] | null, error: unknown }
    if (error || !data?.length) break
    all.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }
  return all
}

export async function GET(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: query } = await supabaseAdmin
      .from('queries').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (!query) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const fields = (query.fields_requested as string[]) ?? []

    // ── PRIMARY: Paginate company_unlocks by query_id ─────────
    const unlockRows = await fetchAllWithRange((offset, end) =>
      supabaseAdmin
        .from('company_unlocks')
        .select('company_id,fields')
        .eq('user_id', user.id)
        .eq('query_id', params.id)
        .range(offset, end)
        .order('unlocked_at')
    )

    const unlockFieldsMap: Record<string, string[]> = {}
    let companyIds: string[] = []

    if (unlockRows.length) {
      for (const u of unlockRows) {
        companyIds.push(u.company_id as string)
        unlockFieldsMap[u.company_id as string] = (u.fields as string[]) ?? []
      }
    } else {
      // ── FALLBACK: Time-window around query creation ───────────
      const createdAt = new Date(query.created_at as string)
      const windowStart = new Date(createdAt.getTime() - 10 * 60_000).toISOString()
      const windowEnd   = new Date(createdAt.getTime() + 5  * 60_000).toISOString()

      const timeUnlocks = await fetchAllWithRange((offset, end) =>
        supabaseAdmin
          .from('company_unlocks')
          .select('company_id,fields')
          .eq('user_id', user.id)
          .gte('unlocked_at', windowStart)
          .lte('unlocked_at', windowEnd)
          .range(offset, end)
          .order('unlocked_at')
      )

      if (timeUnlocks.length) {
        for (const u of timeUnlocks) {
          companyIds.push(u.company_id as string)
          unlockFieldsMap[u.company_id as string] = (u.fields as string[]) ?? []
        }
      } else {
        // Last resort: latest N by result_count
        const latestUnlocks = await fetchAllWithRange((offset, end) =>
          supabaseAdmin
            .from('company_unlocks')
            .select('company_id,fields')
            .eq('user_id', user.id)
            .order('unlocked_at', { ascending: false })
            .range(offset, Math.min(end, (query.result_count as number ?? 100) - 1))
        )
        for (const u of latestUnlocks) {
          companyIds.push(u.company_id as string)
          unlockFieldsMap[u.company_id as string] = (u.fields as string[]) ?? []
        }
      }
    }

    if (!companyIds.length) return NextResponse.json({ query, companies: [], fields })

    // ── Fetch companies in chunks of 500 ──────────────────────
    const allCompanies: Record<string, unknown>[] = []
    for (let i = 0; i < companyIds.length; i += BATCH) {
      const chunk = companyIds.slice(i, i + BATCH)
      const { data, error } = await supabaseAdmin
        .from('companies')
        .select('id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,activities,forme_juridique,phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description,rating')
        .in('id', chunk)
        .limit(BATCH)
      if (error) { console.error('Companies fetch error:', error); continue }
      allCompanies.push(...(data ?? []))
    }

    // ── Enrich with unlocked_fields ───────────────────────────
    const enriched = allCompanies.map(c => {
      let uf = unlockFieldsMap[c.id as string] ?? []
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
