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

// GET /api/admin/datasets/[id]/companies?page=1 — paginated browse
export async function GET(req: NextRequest, { params }: P) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const perPage = 50
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, count, error } = await supabaseAdmin
      .from('dataset_companies').select('*', { count: 'exact' })
      .eq('dataset_id', params.id).order('name').range(from, to)
    if (error) throw error

    return NextResponse.json({ companies: data ?? [], total: count ?? 0, page, perPage })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/datasets/[id]/companies — manual single row add
export async function POST(req: NextRequest, { params }: P) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('dataset_companies').insert({
      dataset_id: params.id,
      name: body.name, city: body.city ?? null, address_raw: body.address_raw ?? null,
      phone_1: body.phone_1 ?? null, phone_2: body.phone_2 ?? null, email: body.email ?? null,
      website: body.website ?? null, director: body.director ?? null, ice: body.ice ?? null,
      rc: body.rc ?? null, capital: body.capital ?? null, effectif: body.effectif ?? null,
      forme_juridique: body.forme_juridique ?? null, annee_creation: body.annee_creation ?? null,
      primary_sector: body.primary_sector ?? null, extra_fields: body.extra_fields ?? {},
    }).select('*').single()
    if (error) throw error

    const { data: ds } = await supabaseAdmin.from('datasets').select('record_count').eq('id', params.id).single()
    await supabaseAdmin.from('datasets').update({ record_count: (ds?.record_count ?? 0) + 1 }).eq('id', params.id)

    return NextResponse.json({ company: data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
