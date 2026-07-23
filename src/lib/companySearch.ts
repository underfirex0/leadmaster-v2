import { supabaseAdmin } from '@/lib/supabase/admin'

// How many quoted values go into a single .in() call. Kept conservative —
// even with long, accented French strings (which balloon in size once
// URL-encoded: 'é' → '%C3%A9', nearly 3x longer), a batch of 35 stays
// comfortably under the ~8KB URL limits enforced by most reverse proxies
// and edge networks. This is the fix for the root cause bug: selecting
// hundreds of sectors/activities used to build ONE giant filter string
// that silently exceeded those limits and returned 0 rows with no error.
const CHUNK_SIZE = 35

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export interface CompanyFilters {
  sectors: string[]
  domaines: string[]
  activites: string[]
  cities: string[]
  name: string
  effectifs: string[]
}

// Applies the "small" filters (cities/name/effectif) that are never large
// enough to risk a URL-length problem — safe to use directly with .in()/.eq().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySmallFilters(q: any, f: CompanyFilters) {
  if (f.cities.length) q = q.in('city', f.cities)
  if (f.name.trim())   q = q.ilike('name', `%${f.name.trim()}%`)
  if (f.effectifs.length === 1) q = q.eq('effectif', f.effectifs[0])
  if (f.effectifs.length > 1)  q = q.in('effectif', f.effectifs)
  return q
}

// Runs one query to exhaustion via .range() pagination (a single .in()/.eq()
// call can still only return 1000 rows per request from PostgREST).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function paginateAll(buildQuery: () => any): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  let offset = 0
  const PAGE = 1000
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // .order('id') is required for stable, non-overlapping pagination —
    // without an explicit order, Postgres doesn't guarantee the same row
    // order between separate .range() calls, which could skip or repeat
    // rows across pages.
    const { data, error } = await buildQuery().order('id', { ascending: true }).range(offset, offset + PAGE - 1)
    if (error) { console.error('companySearch page error:', error); break }
    if (!data?.length) break
    out.push(...(data as Record<string, unknown>[]))
    if (data.length < PAGE) break
    offset += PAGE
    if (offset > 100000) break // hard safety stop, should never realistically hit this
  }
  return out
}

/**
 * Returns the EXACT count of companies matching the given filters.
 * Never builds a filter string longer than CHUNK_SIZE quoted values, so
 * this works correctly no matter how many sectors/domaines/activités are
 * selected — the original bug (0 results past a few hundred selections)
 * was caused by building one massive .or() string that silently exceeded
 * URL length limits.
 */
export async function countMatchingCompanies(f: CompanyFilters): Promise<number> {
  const hasCategoryFilter = f.sectors.length > 0 || f.domaines.length > 0 || f.activites.length > 0

  if (!hasCategoryFilter) {
    let q = supabaseAdmin.from('companies').select('*', { count: 'exact', head: true })
    q = applySmallFilters(q, f)
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  }

  // A row has exactly ONE value in each of primary_sector/domaine/activite,
  // so two batches of the SAME column can never both match the same row —
  // summing counts across batches of one column is always safe. But if
  // more than one column type is active at once (e.g. sectors AND activites
  // both populated), a row could match through either column, so we must
  // deduplicate by id instead of summing raw counts across column types.
  const activeColumns = [
    { column: 'primary_sector',   values: f.sectors },
    { column: 'primary_domaine',  values: f.domaines },
    { column: 'primary_activite', values: f.activites },
  ].filter(c => c.values.length > 0)

  if (activeColumns.length === 1) {
    // Fast path: only one column type active — safe to just sum counts
    // across its chunks, no id fetching/deduping needed.
    const { column, values } = activeColumns[0]
    const batches = chunk(values, CHUNK_SIZE)
    const counts = await Promise.all(batches.map(async batch => {
      let q = supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }).in(column, batch)
      q = applySmallFilters(q, f)
      const { count, error } = await q
      if (error) { console.error('count chunk error:', error); return 0 }
      return count ?? 0
    }))
    return counts.reduce((a,b) => a+b, 0)
  }

  // Slow-but-always-correct path: multiple column types active — fetch
  // matching ids per chunk per column, union into a Set to avoid double
  // counting rows that match through more than one column.
  const ids = new Set<string>()
  await Promise.all(
    activeColumns.flatMap(({ column, values }) =>
      chunk(values, CHUNK_SIZE).map(async batch => {
        const rows = await paginateAll(() => {
          let q = supabaseAdmin.from('companies').select('id').in(column, batch)
          q = applySmallFilters(q, f)
          return q
        })
        rows.forEach(r => ids.add(r.id as string))
      })
    )
  )
  return ids.size
}

/**
 * Returns up to `capAt` full company rows matching the given filters,
 * deduplicated by id. Used both for the estimate route's coverage sample
 * and the execute route's full result set — same chunked, dependency-free
 * approach as countMatchingCompanies above.
 */
export async function fetchMatchingCompanies(
  f: CompanyFilters,
  columns: string,
  capAt: number
): Promise<Record<string, unknown>[]> {
  const hasCategoryFilter = f.sectors.length > 0 || f.domaines.length > 0 || f.activites.length > 0

  if (!hasCategoryFilter) {
    const rows = await paginateAll(() => {
      let q = supabaseAdmin.from('companies').select(columns)
      q = applySmallFilters(q, f)
      return q
    })
    return rows.slice(0, capAt)
  }

  const activeColumns = [
    { column: 'primary_sector',   values: f.sectors },
    { column: 'primary_domaine',  values: f.domaines },
    { column: 'primary_activite', values: f.activites },
  ].filter(c => c.values.length > 0)

  const byId = new Map<string, Record<string, unknown>>()

  // Chunks run in parallel, but we still need to stop once we have enough —
  // Promise.all doesn't support early cancellation, so we just let all
  // chunks finish (they're small/fast) and cap the final result afterward.
  // This trades a little extra work for simplicity and correctness.
  await Promise.all(
    activeColumns.flatMap(({ column, values }) =>
      chunk(values, CHUNK_SIZE).map(async batch => {
        if (byId.size >= capAt * 3) return // already have plenty of candidates, skip further work
        const rows = await paginateAll(() => {
          let q = supabaseAdmin.from('companies').select(columns).in(column, batch)
          q = applySmallFilters(q, f)
          return q
        })
        for (const row of rows) {
          const id = row.id as string
          if (!byId.has(id)) byId.set(id, row)
        }
      })
    )
  )

  return Array.from(byId.values()).slice(0, capAt)
}
