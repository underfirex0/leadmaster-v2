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

    const companyIds = (query.company_ids as string[]) ?? []
    if (!companyIds.length) return NextResponse.json({ query, companies: [], fields: query.fields_requested ?? [] })

    // Fetch companies
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,activities,forme_juridique,phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description,rating')
      .in('id', companyIds)

    // Fetch unlock info for this user
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', user.id).in('company_id', companyIds)
    const unlockMap: Record<string, string[]> = {}
    for (const u of unlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    const enriched = (companies ?? []).map(c => ({
      ...c,
      unlocked_fields: unlockMap[c.id] ?? [],
    }))

    return NextResponse.json({ query, companies: enriched, fields: query.fields_requested ?? [] })
  } catch (e) {
    console.error('Searches detail error:', e)
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
