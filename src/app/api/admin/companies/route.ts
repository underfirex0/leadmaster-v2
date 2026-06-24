export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: p } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!p?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page  = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '25')
    const name  = searchParams.get('name') ?? ''
    const city  = searchParams.get('city') ?? ''
    const offset = (page - 1) * limit

    let q = supabaseAdmin
      .from('companies')
      .select('id, name, city, phone_1, email, website, director, forme_juridique, annee_creation, ice, activities', { count: 'exact' })

    if (name) q = q.ilike('name', `%${name}%`)
    if (city) q = q.ilike('city', `%${city}%`)

    const { data, count, error } = await q.order('name').range(offset, offset + limit - 1)
    if (error) throw error

    return NextResponse.json({ companies: data ?? [], total: count ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
