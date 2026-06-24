export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page    = parseInt(searchParams.get('page') ?? '1')
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
    const city    = searchParams.get('city') ?? ''
    const search  = searchParams.get('search') ?? ''
    const sector  = searchParams.get('sector') ?? ''
    const offset  = (page - 1) * limit

    // Fetch ALL unlock records for this user (needed to build the company IN clause).
    // Supabase defaults to 1000 rows — override with a large limit so users with
    // many unlocks don't silently lose data. count: 'exact' gives us the true total.
    const { data: unlocks, count: totalCount } = await supabaseAdmin
      .from('company_unlocks')
      .select('company_id, unlocked_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })
      .limit(50000)

    if (!unlocks?.length) {
      return NextResponse.json({ companies: [], totalCount: 0, page, hasMore: false })
    }

    const allCompanyIds = unlocks.map(u => u.company_id)
    const unlockedAtMap: Record<string, string> = {}
    for (const u of unlocks) unlockedAtMap[u.company_id] = u.unlocked_at

    // Build company query
    let companyQuery = supabaseAdmin
      .from('companies')
      .select(`
        id, telecontact_id, name, city, address_raw,
        phone_1, phone_2, email, website,
        facebook, instagram, youtube, linkedin,
        ice, director, forme_juridique, capital, annee_creation, rc,
        activities, description, rating, review_count, is_recommended, logo_url
      `)
      .in('id', allCompanyIds)

    if (city)   companyQuery = companyQuery.eq('city', city)
    if (search) companyQuery = companyQuery.ilike('name', `%${search}%`)

    const { data: companies, error } = await companyQuery
      .order('name')
      .range(offset, offset + limit - 1)

    if (error) throw error

    // When filters are active, totalCount from unlocks table is inaccurate — get filtered count
    let resolvedTotal = totalCount ?? 0
    if (city || search) {
      let countQuery = supabaseAdmin
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .in('id', allCompanyIds)
      if (city)   countQuery = countQuery.eq('city', city)
      if (search) countQuery = countQuery.ilike('name', `%${search}%`)
      const { count: filteredCount } = await countQuery
      resolvedTotal = filteredCount ?? 0
    }

    const enriched = (companies ?? []).map(c => ({
      ...c,
      is_unlocked: true,
      unlocked_at: unlockedAtMap[c.id],
    }))

    return NextResponse.json({
      companies: enriched,
      totalCount: resolvedTotal,
      page,
      hasMore: offset + limit < resolvedTotal,
    })
  } catch (e) {
    console.error('My data error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
