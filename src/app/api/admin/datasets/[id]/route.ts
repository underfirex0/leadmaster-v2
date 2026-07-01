export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type P = { params: { id: string } }

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Accès interdit' }, { status: 403 }) }
  return { user }
}

// GET /api/admin/datasets/[id] — detail + sample rows
export async function GET(req: NextRequest, { params }: P) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { data: dataset, error } = await supabaseAdmin.from('datasets').select('*').eq('id', params.id).single()
    if (error || !dataset) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const { data: sample } = await supabaseAdmin
      .from('dataset_companies').select('*').eq('dataset_id', params.id).limit(10)

    return NextResponse.json({ dataset, sample: sample ?? [] })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/admin/datasets/[id] — update metadata / activate / deactivate / edit schema
export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = await req.json()
    const allowed = ['name', 'description', 'sector_tag', 'credit_cost', 'cover_emoji', 'is_active', 'field_schema']
    const update: Record<string, unknown> = {}
    for (const key of allowed) if (key in body) update[key] = body[key]
    if (!Object.keys(update).length) return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('datasets').update(update).eq('id', params.id).select('*').single()
    if (error) throw error

    return NextResponse.json({ dataset: data })
  } catch (e) {
    console.error('Admin dataset update error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/admin/datasets/[id] — remove dataset + all its rows + unlocks
export async function DELETE(req: NextRequest, { params }: P) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { error } = await supabaseAdmin.from('datasets').delete().eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
