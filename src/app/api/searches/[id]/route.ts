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

    // Get query record
    const { data: query } = await supabaseAdmin
      .from('queries').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (!query) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Get company_unlocks filtered by THIS query's id
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks')
      .select('company_id, fields')
      .eq('user_id', user.id)
      .eq('query_id', params.id)   // ← Filter by specific search

    if (!unlocks?.length) {
      // Fallback: if old unlocks have no query_id, still try to show something
      return NextResponse.json({ query, companies: [], note: 'no_unlocks_for_query' })
    }

    const ids = unlocks.map((u: { company_id: string }) => u.company_id)
    const fields = (query.fields_requested as string[]) ?? []

    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,activities,' +
              'phone_1,phone_2,email,website,director,ice,rc,capital,forme_juridique,' +
              'address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description')
      .in('id', ids)

    if (error) throw error
    return NextResponse.json({ query, companies: companies ?? [] })
  } catch (e) {
    console.error('Searches [id] GET error:', e)
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
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
