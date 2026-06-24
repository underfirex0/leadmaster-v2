export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: query } = await supabaseAdmin
      .from('queries').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (!query) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Get all company IDs for this query's unlocks
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id, fields').eq('user_id', user.id)

    if (!unlocks?.length) return NextResponse.json({ query, companies: [] })

    const fields = (query.fields_requested as string[]) ?? []
    const ids    = unlocks.map((u: { company_id: string }) => u.company_id)

    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, city, annee_creation, primary_sector, activities, phone_1, phone_2, email, website, director, ice, rc, capital, forme_juridique, address_raw, facebook, instagram, linkedin, logo_url')
      .in('id', ids)

    return NextResponse.json({ query, companies: companies ?? [] })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    await supabaseAdmin.from('queries').delete().eq('id', params.id).eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }) }
}
