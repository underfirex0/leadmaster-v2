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

    const { data: query, error: qErr } = await supabaseAdmin
      .from('queries').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (qErr || !query) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const fields = (query.fields_requested as string[]) ?? []

    // ── Get company IDs from query.company_ids (source of truth) ──
    const companyIds = (query.company_ids as string[]) ?? []

    if (!companyIds.length) {
      // Old query without company_ids — nothing to show
      return NextResponse.json({ query, companies: [], fields })
    }

    // ── Fetch all companies for this search ───────────────────
    const { data: companies, error: cErr } = await supabaseAdmin
      .from('companies')
      .select(
        'id,name,city,annee_creation,primary_sector,primary_domaine,primary_activite,' +
        'activities,phone_1,phone_2,email,website,director,ice,rc,capital,forme_juridique,' +
        'address_raw,latitude,longitude,facebook,instagram,linkedin,youtube,logo_url,description'
      )
      .in('id', companyIds)

    if (cErr) throw cErr

    return NextResponse.json({ query, companies: companies ?? [], fields })
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
