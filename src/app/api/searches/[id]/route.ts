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

    // ── Fetch companies in chunks of 500 — from companies_v2 (the clean,
    // rebuilt table), joined to taxonomy to reconstruct the sector/domaine/
    // activité text fields the results UI already expects, and mapping
    // renamed columns (capital_mad, effectif_tranche) back to the field
    // names the frontend already renders (capital, effectif). This is what
    // makes a search launched from the new wizard actually show the
    // cleaned v2 data instead of stale data from the old companies table. ──
    const allCompanies: Record<string, unknown>[] = []
    for (let i = 0; i < companyIds.length; i += BATCH) {
      const idBatch = companyIds.slice(i, i + BATCH)
      const { data, error } = await supabaseAdmin
        .from('companies_v2')
        .select('id,name,city,annee_creation,forme_juridique,phone_1,phone_2,email,website,' +
          'director,ice,rc,effectif_tranche,capital_mad,address_raw,latitude,longitude,description,' +
          'taxonomy:primary_taxonomy_id(sector,domaine,activite)')
        .in('id', idBatch)
        .limit(BATCH)
      if (error) { console.error('Companies fetch error:', error); continue }
      for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
        const tax = row.taxonomy as { sector?: string; domaine?: string; activite?: string } | null
        allCompanies.push({
          ...row,
          primary_sector:   tax?.sector   ?? null,
          primary_domaine:  tax?.domaine  ?? null,
          primary_activite: tax?.activite ?? null,
          effectif: row.effectif_tranche ?? null,
          capital:  row.capital_mad != null ? String(row.capital_mad) : null,
        })
      }
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
