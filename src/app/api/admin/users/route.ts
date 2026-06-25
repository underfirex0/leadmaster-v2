export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search  = searchParams.get('search') ?? ''
    const planId  = searchParams.get('plan') ?? ''
    const page    = parseInt(searchParams.get('page') ?? '1')
    const limit   = parseInt(searchParams.get('limit') ?? '20')
    const offset  = (page - 1) * limit

    let q = supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,plan_id,credit_balance,is_admin,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    if (planId) q = q.eq('plan_id', planId)

    const { data: users, count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get unlock counts per user
    const userIds = (users ?? []).map(u => u.id)
    let unlockCounts: Record<string, number> = {}
    let searchCounts: Record<string, number> = {}
    if (userIds.length) {
      const { data: unlocks } = await supabaseAdmin
        .from('company_unlocks').select('user_id').in('user_id', userIds)
      for (const u of unlocks ?? []) unlockCounts[u.user_id] = (unlockCounts[u.user_id] ?? 0) + 1

      const { data: searches } = await supabaseAdmin
        .from('queries').select('user_id').in('user_id', userIds)
      for (const s of searches ?? []) searchCounts[s.user_id] = (searchCounts[s.user_id] ?? 0) + 1
    }

    const enriched = (users ?? []).map(u => ({
      ...u,
      unlock_count: unlockCounts[u.id] ?? 0,
      search_count: searchCounts[u.id] ?? 0,
    }))

    return NextResponse.json({ users: enriched, total: count ?? 0 })
  } catch (e) {
    console.error('Admin users error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
