export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { NomenclatureSector, NomenclatureDomaine, NomenclatureActivite } from '@/types'

// ── Server-side cache (unfiltered full tree only) ─────────────
let cache: NomenclatureSector[] | null = null
let cacheTs = 0
const CACHE_TTL = 1000 * 60 * 30 // 30 min

// ── Build tree from raw rows ──────────────────────────────────
type RawRow = { sector: string; domaine: string; activite: string; count: number }

function buildTree(rows: RawRow[]): NomenclatureSector[] {
  const sectorMap = new Map<string, Map<string, Map<string, number>>>()

  for (const row of rows) {
    if (!row.sector) continue
    if (!sectorMap.has(row.sector)) sectorMap.set(row.sector, new Map())
    const dMap = sectorMap.get(row.sector)!
    const dom = row.domaine || row.sector
    if (!dMap.has(dom)) dMap.set(dom, new Map())
    const aMap = dMap.get(dom)!
    const act = row.activite || dom
    aMap.set(act, (aMap.get(act) ?? 0) + row.count)
  }

  const tree: NomenclatureSector[] = []
  for (const [sector, dMap] of sectorMap) {
    const domaines: NomenclatureDomaine[] = []
    let sectorTotal = 0
    for (const [domaine, aMap] of dMap) {
      const activites: NomenclatureActivite[] = []
      let domTotal = 0
      for (const [activite, count] of aMap) {
        activites.push({
          activite,
          rubs: [{ id: activite, sector, domaine, activite, rub: activite, rub_slug: activite }],
          count,
        } as NomenclatureActivite & { count: number })
        domTotal += count
      }
      sectorTotal += domTotal
      domaines.push({ domaine, activites, totalRubs: domTotal })
    }
    tree.push({ sector, domaines, totalRubs: sectorTotal })
  }
  return tree
}

// ── Fetch all company rows with thin select (for filtered counts) ──
async function fetchFilteredRows(cities: string[], name: string): Promise<RawRow[]> {
  const results: RawRow[] = []
  let from = 0

  while (true) {
    let q = supabaseAdmin
      .from('companies')
      .select('primary_sector,primary_domaine,primary_activite')

    if (cities.length) q = q.in('city', cities)
    if (name)          q = q.ilike('name', `%${name}%`)

    const { data, error } = await (q as typeof q).range(from, from + 999)
    if (error) throw error
    if (!data?.length) break

    for (const r of data) {
      results.push({
        sector:  (r.primary_sector  as string) ?? '',
        domaine: (r.primary_domaine as string) ?? '',
        activite:(r.primary_activite as string) ?? '',
        count: 1,
      })
    }

    if (data.length < 1000) break
    from += 1000
  }

  return results
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const citiesParam = searchParams.get('cities') ?? ''
    const nameParam   = (searchParams.get('name') ?? '').trim()
    const cities      = citiesParam ? citiesParam.split(',').filter(Boolean) : []
    const isFiltered  = cities.length > 0 || nameParam.length > 0

    const now = Date.now()

    // Use in-memory cache only for the unfiltered full tree
    if (!isFiltered && cache && (now - cacheTs) < CACHE_TTL) {
      return NextResponse.json(cache)
    }

    let rows: RawRow[]

    if (isFiltered) {
      // Query companies table directly — counts are per-filter-set
      rows = await fetchFilteredRows(cities, nameParam)
    } else {
      // Use RPC (aggregated GROUP BY, fast) for the unfiltered tree
      const { data, error } = await supabaseAdmin.rpc('get_nomenclature_tree')
      if (error) throw error

      rows = ((data ?? []) as { sector:string; domaine:string; activite:string; company_count:number }[])
        .map(r => ({
          sector:   r.sector   ?? '',
          domaine:  r.domaine  ?? '',
          activite: r.activite ?? '',
          count: Number(r.company_count),
        }))
    }

    const tree = buildTree(rows)

    // Only cache the full unfiltered tree
    if (!isFiltered) {
      cache  = tree
      cacheTs = now
    }

    return NextResponse.json(tree)
  } catch (e) {
    console.error('Nomenclature error:', e)
    return NextResponse.json({ error: 'Erreur nomenclature' }, { status: 500 })
  }
}
