export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PAGE_SIZE } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const {
      sectors   = [],   // primary_sector values
      domaines  = [],   // primary_domaine values
      activites = [],   // primary_activite values
      rub_slugs = [],   // legacy compat (treated as activites)
      cities    = [],
      name      = '',
      page      = 1,
      limit     = PAGE_SIZE
    } = body

    const offset      = (page - 1) * limit
    const actualLimit = Math.min(limit, 100)

    // Merge rub_slugs into activites for backward compat
    const allActivites = [...new Set([...activites, ...rub_slugs])]

    const { data, error } = await supabaseAdmin.rpc('search_companies_v2', {
      p_sectors:   sectors.length   ? sectors   : null,
      p_domaines:  domaines.length  ? domaines  : null,
      p_activites: allActivites.length ? allActivites : null,
      p_rub_slugs: null,
      p_cities:    cities.length    ? cities    : null,
      p_name:      name.trim()      || null,
      p_limit:     actualLimit,
      p_offset:    offset,
    })

    if (error) {
      console.error('Search RPC error:', error)
      return NextResponse.json({ error: 'Erreur recherche: ' + error.message }, { status: 500 })
    }

    const totalCount = (data?.[0]?.total_count as number) ?? 0
    const companies = (data ?? []).map((row: Record<string, unknown>) => ({
      id:              row.id,
      name:            row.name,
      city:            row.city,
      annee_creation:  row.annee_creation,
      forme_juridique: row.forme_juridique,
      logo_url:        row.logo_url,
      rating:          row.rating,
      review_count:    row.review_count,
      is_recommended:  row.is_recommended,
      activities:      Array.isArray(row.activities) ? row.activities : [],
      is_unlocked:     false,
    }))

    // Check which are already unlocked by this user
    if (companies.length > 0) {
      const ids = companies.map((c: { id: string }) => c.id)
      const { data: unlocks } = await supabaseAdmin
        .from('company_unlocks')
        .select('company_id')
        .eq('user_id', user.id)
        .in('company_id', ids)

      const unlockedSet = new Set((unlocks ?? []).map(u => u.company_id))
      for (const c of companies) {
        (c as Record<string, unknown>).is_unlocked = unlockedSet.has((c as { id: string }).id)
      }
    }

    // Save to query history on first page only (non-blocking)
    if (page === 1) supabaseAdmin.from('queries').insert({
      user_id:          user.id,
      filters:          { sectors, domaines, activites: allActivites, cities, name },
      fields_requested: [],
      result_count:     totalCount,
      credits_spent:    0,
    }).then(() => {}).catch(() => {})


    return NextResponse.json({
      companies,
      totalCount,
      page,
      hasMore: offset + actualLimit < totalCount,
    })
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
