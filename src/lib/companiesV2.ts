import { supabaseAdmin } from '@/lib/supabase/admin'

// ═══════════════════════════════════════════════════════════
// LeadMaster v2 — the ONLY module that ever queries companies_v2/
// taxonomy/company_taxonomy. Every route (search, estimate, CRM,
// admin) goes through here. No RPC functions, no in-memory caching —
// with real indexed columns (numeric capital, enum effectif, integer
// taxonomy ids) a plain indexed Postgres query is fast enough on its
// own, and "which code path is actually live" can never be ambiguous
// again because there's exactly one.
// ═══════════════════════════════════════════════════════════

export interface TaxonomyNode {
  id: number
  sector: string
  domaine: string
  activite: string
}

export interface TaxonomyTree {
  sector: string
  totalCount: number
  domaines: {
    domaine: string
    totalCount: number
    activites: { id: number; activite: string; count: number }[]
  }[]
}

export interface CompanyFiltersV2 {
  taxonomyIds?: number[]      // selected activité leaf ids (already resolved from the tree UI)
  cities?: string[]
  name?: string
  effectifTranches?: string[]
  capitalMin?: number
  capitalMax?: number
}

// ── Full taxonomy tree, with LIVE counts from company_taxonomy ──
// Optionally scoped to a set of cities, so Step 2 of the wizard reflects
// "how many in this sector, given the city already chosen in Step 1" —
// not a disconnected global number.
export async function getTaxonomyTree(cities?: string[]): Promise<TaxonomyTree[]> {
  const counts = new Map<number, number>()
  const meta = new Map<number, TaxonomyNode>()

  let from = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = supabaseAdmin
      .from('company_taxonomy')
      .select('taxonomy_id, taxonomy:taxonomy_id(id, sector, domaine, activite), companies_v2!inner(city)')
      .eq('is_primary', true)
    if (cities?.length) q = q.in('companies_v2.city', cities)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    for (const row of data as unknown as { taxonomy_id: number; taxonomy: TaxonomyNode }[]) {
      counts.set(row.taxonomy_id, (counts.get(row.taxonomy_id) ?? 0) + 1)
      if (row.taxonomy) meta.set(row.taxonomy_id, row.taxonomy)
    }
    if (data.length < 1000) break
    from += 1000
  }

  const sectorMap = new Map<string, Map<string, { id: number; activite: string; count: number }[]>>()
  for (const [taxId, count] of counts) {
    const node = meta.get(taxId)
    if (!node) continue
    if (!sectorMap.has(node.sector)) sectorMap.set(node.sector, new Map())
    const domMap = sectorMap.get(node.sector)!
    if (!domMap.has(node.domaine)) domMap.set(node.domaine, [])
    domMap.get(node.domaine)!.push({ id: taxId, activite: node.activite, count })
  }

  const tree: TaxonomyTree[] = []
  for (const [sector, domMap] of sectorMap) {
    const domaines = []
    let sectorTotal = 0
    for (const [domaine, activites] of domMap) {
      const domTotal = activites.reduce((s, a) => s + a.count, 0)
      sectorTotal += domTotal
      domaines.push({ domaine, totalCount: domTotal, activites: activites.sort((a,b) => a.activite.localeCompare(b.activite)) })
    }
    tree.push({ sector, totalCount: sectorTotal, domaines: domaines.sort((a,b) => a.domaine.localeCompare(b.domaine)) })
  }
  return tree.sort((a, b) => a.sector.localeCompare(b.sector))
}

// ── Apply the small, safe filters (city/name/effectif/capital) ──
// Works on BOTH a plain companies_v2 query and one going through the
// company_taxonomy join — Supabase lets you filter an embedded/joined
// table's columns via 'company_taxonomy.companies_v2.<col>' dot-path,
// but since we always select FROM companies_v2 (optionally inner-joined
// to company_taxonomy for the taxonomy filter), plain column names work
// in both cases.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBaseFilters(q: any, f: CompanyFiltersV2) {
  if (f.cities?.length) q = q.in('city', f.cities)
  if (f.name?.trim())   q = q.ilike('name', `%${f.name.trim()}%`)
  if (f.effectifTranches?.length === 1) q = q.eq('effectif_tranche', f.effectifTranches[0])
  if (f.effectifTranches?.length && f.effectifTranches.length > 1) q = q.in('effectif_tranche', f.effectifTranches)
  if (f.capitalMin != null) q = q.gte('capital_mad', f.capitalMin)
  if (f.capitalMax != null) q = q.lte('capital_mad', f.capitalMax)
  return q
}

// ── Exact count of companies matching the given filters ──
// FAST PATH: a single JOIN+COUNT query, no multi-step id resolution.
//
// This intentionally matches only each company's PRIMARY taxonomy link
// (is_primary = true), which is guaranteed exactly one row per company —
// that's what makes a single query safe here with zero risk of a company
// being counted twice. The ~140 secondary-activity links (companies with
// more than one real business activity) are not yet matched by search;
// that needs proper fuzzy-text matching against the raw scraped activity
// labels (see ARCHITECTURE_REBUILD_PLAN.md) and is intentionally deferred
// rather than risking duplicate-counting bugs to include it now.
export async function countMatchingCompanies(f: CompanyFiltersV2): Promise<number> {
  if (f.taxonomyIds?.length) {
    let q = supabaseAdmin
      .from('companies_v2')
      .select('id, company_taxonomy!inner(taxonomy_id)', { count: 'exact', head: true })
      .eq('company_taxonomy.is_primary', true)
      .in('company_taxonomy.taxonomy_id', f.taxonomyIds)
    q = applyBaseFilters(q, f)
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  }

  let q = supabaseAdmin.from('companies_v2').select('*', { count: 'exact', head: true })
  q = applyBaseFilters(q, f)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

// ── Fetch up to `limit` full company rows matching the filters ──
// Same single-query JOIN approach — no more paginated id-resolution pass.
export async function fetchMatchingCompanies(
  f: CompanyFiltersV2,
  columns: string,
  limit: number,
  offset = 0
): Promise<Record<string, unknown>[]> {
  if (f.taxonomyIds?.length) {
    let q = supabaseAdmin
      .from('companies_v2')
      .select(`${columns}, company_taxonomy!inner(taxonomy_id)`)
      .eq('company_taxonomy.is_primary', true)
      .in('company_taxonomy.taxonomy_id', f.taxonomyIds)
      .order('id')
      .range(offset, offset + limit - 1)
    q = applyBaseFilters(q, f)
    const { data, error } = await q
    if (error) throw error
    // Strip the embedded join payload — callers only expect the named
    // companies_v2 columns they asked for.
    return (data ?? []).map((row: Record<string, unknown>) => {
      const { company_taxonomy, ...rest } = row
      void company_taxonomy
      return rest
    })
  }

  let q = supabaseAdmin.from('companies_v2').select(columns).order('id').range(offset, offset + limit - 1)
  q = applyBaseFilters(q, f)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as Record<string, unknown>[]
}

// ── Get every distinct city that has at least one company (for the picker) ──
export async function getAvailableCities(): Promise<{ city: string; count: number }[]> {
  const counts = new Map<string, number>()
  let from = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('companies_v2')
      .select('city')
      .not('city', 'is', null)
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      const c = (row as { city: string }).city
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    if (data.length < 1000) break
    from += 1000
  }
  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
}

export const EFFECTIF_TRANCHES = [
  'De 1 à 9 salariés',
  'De 10 à 19 salariés',
  'De 20 à 49 salariés',
  'De 50 à 99 salariés',
  'De 100 à 249 salariés',
  'De 250 à 499 salariés',
  'De 500 à 999 salariés',
  'De 1 000 à 4 999 salariés',
  'Plus de 5 000 salariés',
]

export const CAPITAL_TRANCHES = [
  { value: '0-100000',          label: 'Moins de 100 000 MAD',  min: 0,         max: 100000 },
  { value: '100000-500000',     label: '100 000 — 500 000 MAD', min: 100000,    max: 500000 },
  { value: '500000-1000000',    label: '500 000 — 1M MAD',      min: 500000,    max: 1000000 },
  { value: '1000000-5000000',   label: '1M — 5M MAD',           min: 1000000,   max: 5000000 },
  { value: '5000000-10000000',  label: '5M — 10M MAD',          min: 5000000,   max: 10000000 },
  { value: '10000000-50000000', label: '10M — 50M MAD',         min: 10000000,  max: 50000000 },
  { value: '50000000-',         label: 'Plus de 50M MAD',       min: 50000000,  max: null },
]
