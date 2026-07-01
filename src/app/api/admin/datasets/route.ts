export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Accès interdit' }, { status: 403 }) }
  return { user }
}

// GET /api/admin/datasets — list all (active + inactive) with real record counts
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { data: datasets, error } = await supabaseAdmin
      .from('datasets').select('*').order('created_at', { ascending: false })
    if (error) throw error

    // unlock counts per dataset
    const { data: unlockCounts } = await supabaseAdmin
      .from('dataset_unlocks').select('dataset_id')
    const countsMap: Record<string, number> = {}
    for (const u of unlockCounts ?? []) {
      const id = u.dataset_id as string
      countsMap[id] = (countsMap[id] ?? 0) + 1
    }

    const result = (datasets ?? []).map(d => ({ ...d, purchases: countsMap[d.id as string] ?? 0 }))
    return NextResponse.json({ datasets: result })
  } catch (e) {
    console.error('Admin datasets list error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/datasets — create a new (empty) dataset shell
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = await req.json()
    const { name, description, sector_tag, credit_cost, cover_emoji } = body
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('datasets').insert({
      name,
      description: description ?? null,
      sector_tag: sector_tag ?? null,
      credit_cost: Number(credit_cost) || 0,
      cover_emoji: cover_emoji ?? '💎',
      created_by: auth.user!.id,
    }).select('*').single()
    if (error) throw error

    return NextResponse.json({ dataset: data }, { status: 201 })
  } catch (e) {
    console.error('Admin dataset create error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
