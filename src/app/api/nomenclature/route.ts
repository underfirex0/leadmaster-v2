export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { NomenclatureSector, NomenclatureDomaine, NomenclatureActivite } from '@/types'

let cache: NomenclatureSector[] | null = null
let cacheTs = 0
const CACHE_TTL = 1000 * 60 * 30 // 30 min

export async function GET() {
  try {
    const now = Date.now()
    if (cache && (now - cacheTs) < CACHE_TTL) {
      return NextResponse.json(cache)
    }

    // Use RPC that reads directly from companies.primary_sector/domaine/activite
    const { data, error } = await supabaseAdmin.rpc('get_nomenclature_tree')
    if (error) throw error

    // Build tree: sector → domaine → activite (with counts)
    const sectorMap = new Map<string, Map<string, Map<string, number>>>()

    for (const row of (data ?? []) as { sector: string; domaine: string; activite: string; company_count: number }[]) {
      if (!row.sector) continue
      if (!sectorMap.has(row.sector)) sectorMap.set(row.sector, new Map())
      const domaineMap = sectorMap.get(row.sector)!

      const dom = row.domaine || row.sector
      if (!domaineMap.has(dom)) domaineMap.set(dom, new Map())
      const activiteMap = domaineMap.get(dom)!

      const act = row.activite || dom
      activiteMap.set(act, (activiteMap.get(act) ?? 0) + Number(row.company_count))
    }

    const tree: NomenclatureSector[] = []
    for (const [sector, domaineMap] of sectorMap) {
      const domaines: NomenclatureDomaine[] = []
      let sectorTotal = 0
      for (const [domaine, activiteMap] of domaineMap) {
        const activites: NomenclatureActivite[] = []
        let domaineTotal = 0
        for (const [activite, count] of activiteMap) {
          // Each activite acts as both "rub" and activite in the simplified schema
          activites.push({
            activite,
            rubs: [{ id: activite, sector, domaine, activite, rub: activite, rub_slug: activite }],
            count,
          } as NomenclatureActivite & { count: number })
          domaineTotal += count
        }
        sectorTotal += domaineTotal
        domaines.push({ domaine, activites, totalRubs: domaineTotal })
      }
      tree.push({ sector, domaines, totalRubs: sectorTotal })
    }

    cache = tree
    cacheTs = now
    return NextResponse.json(tree)
  } catch (e) {
    console.error('Nomenclature error:', e)
    return NextResponse.json({ error: 'Erreur nomenclature' }, { status: 500 })
  }
}
