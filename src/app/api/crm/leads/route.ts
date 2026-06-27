export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const LEAD_COLUMNS = 'id,user_id,source,company_id,company_name,phone,email,website,contact_name,city,country,sector,status,priority,notes,callback_date,last_contacted_at,status_changed_at,created_at,updated_at,custom_fields'
const COMPANY_COLUMNS = 'id,name,city,phone_1,phone_2,email,website,director,ice,rc,forme_juridique,primary_sector,primary_activite,activities,address_raw,facebook,instagram,linkedin,annee_creation,effectif,capital'

// Fetch ALL rows from a table bypassing the 1000-row Supabase cap
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(baseQuery: any): Promise<any[]> {
  const results: unknown[] = []
  let from = 0
  const BATCH = 1000
  while (true) {
    const { data, error } = await baseQuery.range(from, from + BATCH - 1)
    if (error) throw error
    if (!data?.length) break
    results.push(...data)
    if (data.length < BATCH) break
    from += BATCH
  }
  return results
}

// Batch fetch companies by ID (PostgREST .in() can struggle with large arrays)
async function fetchCompaniesByIds(ids: string[]): Promise<Record<string, Record<string, unknown>>> {
  const map: Record<string, Record<string, unknown>> = {}
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500)
    const { data } = await supabaseAdmin.from('companies').select(COMPANY_COLUMNS).in('id', batch)
    for (const c of data ?? []) map[c.id as string] = c as Record<string, unknown>
  }
  return map
}

// Batch fetch unlock records
async function fetchUnlocksByIds(userId: string, ids: string[]): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {}
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500)
    const { data } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', userId).in('company_id', batch)
    for (const u of data ?? []) map[u.company_id as string] = (u.fields as string[]) ?? []
  }
  return map
}

// Compute which fields have data (without revealing values)
function computeAvailability(c: Record<string, unknown> | null): Record<string, boolean> {
  if (!c) return {}
  return {
    phone:          !!(c.phone_1 || c.phone_2),
    email:          !!c.email,
    website:        !!c.website,
    director:       !!c.director,
    ice:            !!c.ice,
    annee_creation: !!c.annee_creation,
    effectif:       !!c.effectif,
    capital:        !!c.capital,
    address:        !!c.address_raw,
  }
}

// Data richness score: unlocked fields count (fully revealed) + available (even if locked)
function richnessScore(unlockedFields: string[], availability: Record<string, boolean>): number {
  const unlockedCount = unlockedFields.length
  const availableCount = Object.values(availability).filter(Boolean).length
  // Weight unlocked fields slightly higher to prioritize paid data
  return unlockedCount * 2 + availableCount
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const q      = (searchParams.get('q') ?? '').toLowerCase().trim()

    // ── 1. Fetch ALL leads (paginated to bypass 1000-row cap) ──
    let baseQuery = supabaseAdmin
      .from('crm_leads')
      .select(LEAD_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') baseQuery = baseQuery.eq('status', status)

    const leads = await fetchAll(baseQuery)
    if (!leads.length) return NextResponse.json({ leads: [], counts: {} })

    // ── 2. Batch fetch companies + unlocks ──
    const companyIds = [...new Set(leads.filter(l => l.company_id).map(l => l.company_id as string))]
    const [companyMap, unlockMap] = await Promise.all([
      fetchCompaniesByIds(companyIds),
      fetchUnlocksByIds(user.id, companyIds),
    ])

    // ── 3. Normalize + enrich each lead ──
    const normalized = leads.map(lead => {
      const c   = lead.company_id ? (companyMap[lead.company_id] ?? null) : null
      const uf  = lead.company_id ? (unlockMap[lead.company_id]  ?? []) : []
      const avail = computeAvailability(c)

      // Only surface field values the user has paid to unlock
      const phoneVal    = uf.includes('phone')          ? (c?.phone_1 || c?.phone_2 || null)  : null
      const emailVal    = uf.includes('email')          ? (c?.email   || null)                 : null
      const websiteVal  = uf.includes('website')        ? (c?.website || null)                 : null
      const directorVal = uf.includes('director')       ? (c?.director || null)                : null
      const iceVal      = uf.includes('ice')            ? (c?.ice || null)                     : null
      const anneeVal    = uf.includes('annee_creation') ? (c?.annee_creation || null)          : null
      const effectifVal = uf.includes('effectif')       ? (c?.effectif as string || null)      : null
      const capitalVal  = uf.includes('capital')        ? (c?.capital || null)                 : null
      const addressVal  = uf.includes('address')        ? (c?.address_raw || null)             : null

      // CRM-stored values (set at injection time, always visible)
      const display_phone   = lead.phone   || phoneVal   || null
      const display_email   = lead.email   || emailVal   || null
      const display_website = lead.website || websiteVal || null
      const display_director = lead.contact_name || directorVal || null

      return {
        ...lead,
        display_name:     lead.company_name || (c?.name as string) || '—',
        display_city:     lead.city   || (c?.city as string)           || null,
        display_sector:   lead.sector || (c?.primary_sector as string) || null,
        display_phone,
        display_email,
        display_website,
        display_director,
        display_ice:      iceVal,
        display_address:  addressVal,
        display_capital:  capitalVal,
        display_annee:    anneeVal,
        display_effectif: effectifVal,
        display_activities: c?.activities ?? null,
        unlocked_fields:  uf,
        field_availability: avail,
        richness:         richnessScore(uf, avail),
      }
    })

    // ── 4. Apply search filter ──
    const filtered = q
      ? normalized.filter(l =>
          l.display_name?.toLowerCase().includes(q) ||
          l.display_city?.toLowerCase().includes(q) ||
          l.display_sector?.toLowerCase().includes(q)
        )
      : normalized

    // ── 5. Sort by richness (most data first) ──
    filtered.sort((a, b) => b.richness - a.richness)

    // ── 6. Status counts (paginated, from ALL leads for accuracy) ──
    const allForCounts = await fetchAll(
      supabaseAdmin.from('crm_leads').select('status').eq('user_id', user.id)
    )
    const counts: Record<string, number> = {}
    for (const l of allForCounts) counts[l.status] = (counts[l.status] ?? 0) + 1

    return NextResponse.json({ leads: filtered, counts })
  } catch (e) {
    console.error('CRM GET error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const companyIds: string[] = body.company_ids ?? []
    if (!companyIds.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    const companyMap = await fetchCompaniesByIds(companyIds)

    // Check already in CRM (batched)
    const already = new Set<string>()
    for (let i = 0; i < companyIds.length; i += 500) {
      const batch = companyIds.slice(i, i + 500)
      const { data: existing } = await supabaseAdmin
        .from('crm_leads').select('company_id').eq('user_id', user.id).in('company_id', batch)
      for (const l of existing ?? []) already.add(l.company_id as string)
    }

    const toInsert = companyIds.filter(id => !already.has(id))
    if (!toInsert.length) return NextResponse.json({ added: 0, skipped: already.size, message: 'Déjà dans le CRM' })

    // Insert in batches of 500
    let totalInserted = 0
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500)
      const records = batch.map(id => ({
        user_id: user.id, source: 'data', company_id: id,
        company_name: (companyMap[id]?.name as string) ?? null,
        phone:        (companyMap[id]?.phone_1 as string) ?? null,
        email:        (companyMap[id]?.email as string) ?? null,
        website:      (companyMap[id]?.website as string) ?? null,
        contact_name: (companyMap[id]?.director as string) ?? null,
        city:         (companyMap[id]?.city as string) ?? null,
        sector:       (companyMap[id]?.primary_sector as string) ?? null,
        status: 'to_call', priority: 'normal',
      }))
      const { data: inserted } = await supabaseAdmin.from('crm_leads').insert(records).select('id')
      totalInserted += inserted?.length ?? 0
    }

    return NextResponse.json({
      added: totalInserted, skipped: already.size,
      message: `${totalInserted} lead(s) ajouté(s)${already.size ? ` · ${already.size} déjà présent(s)` : ''}`,
    })
  } catch (e) {
    console.error('CRM POST error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
