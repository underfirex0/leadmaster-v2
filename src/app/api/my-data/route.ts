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
    const page   = parseInt(searchParams.get('page') ?? '1')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
    const city   = searchParams.get('city') ?? ''
    const search = searchParams.get('search') ?? ''
    const offset = (page - 1) * limit

    // Get all unlocked company IDs + which fields were unlocked
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks')
      .select('company_id, fields, unlocked_at, credits_spent')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })

    if (!unlocks?.length) return NextResponse.json({ companies: [], totalCount: 0, page, hasMore: false })

    const totalCount = unlocks.length
    const unlockMap: Record<string, { fields: string[]; unlocked_at: string }> = {}
    for (const u of unlocks) {
      unlockMap[u.company_id] = { fields: (u.fields as string[]) ?? [], unlocked_at: u.unlocked_at }
    }

    // Paginate by slicing unlock IDs
    const pageIds = unlocks.slice(offset, offset + limit).map(u => u.company_id)
    if (!pageIds.length) return NextResponse.json({ companies: [], totalCount, page, hasMore: false })

    let q = supabaseAdmin
      .from('companies')
      .select(`id, name, city, address_raw, phone_1, phone_2, email, website,
               facebook, instagram, linkedin, youtube, ice, director,
               forme_juridique, capital, annee_creation, rc, description,
               activities, primary_sector, primary_domaine, primary_activite,
               rating, logo_url, latitude, longitude`)
      .in('id', pageIds)

    if (city)   q = q.eq('city', city)
    if (search) q = q.ilike('name', `%${search}%`)

    const { data: companies, error } = await q
    if (error) throw error

    const enriched = (companies ?? []).map(c => ({
      ...c,
      is_unlocked: true,
      unlocked_fields: unlockMap[c.id]?.fields ?? [],
      unlocked_at: unlockMap[c.id]?.unlocked_at,
    }))

    return NextResponse.json({ companies: enriched, totalCount, page, hasMore: offset + limit < totalCount })
  } catch (e) {
    console.error('My data error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
