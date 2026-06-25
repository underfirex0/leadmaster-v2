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
    const status = searchParams.get('status')
    const q      = (searchParams.get('q') ?? '').toLowerCase()

    // Step 1: Get all CRM leads
    let query = supabaseAdmin
      .from('crm_leads')
      .select('id,user_id,source,company_id,company_name,phone,email,website,contact_name,city,country,sector,status,priority,notes,callback_date,last_contacted_at,status_changed_at,created_at,updated_at,custom_fields')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)

    const { data: leads, error } = await query
    if (error) {
      console.error('CRM leads error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!leads?.length) return NextResponse.json({ leads: [], counts: {} })

    // Step 2: Fetch company data separately for leads with company_id
    const companyIds = [...new Set(leads.filter(l => l.company_id).map(l => l.company_id as string))]
    const companyMap: Record<string, Record<string, string | null>> = {}

    if (companyIds.length > 0) {
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('id,name,city,phone_1,phone_2,email,website,director,ice,forme_juridique,primary_sector,address_raw,facebook,instagram,linkedin,activities,annee_creation,capital')
        .in('id', companyIds)
      for (const c of companies ?? []) companyMap[c.id] = c as Record<string, string | null>
    }

    // Step 3: Get unlock info for companies
    const unlockMap: Record<string, string[]> = {}
    if (companyIds.length > 0) {
      const { data: unlocks } = await supabaseAdmin
        .from('company_unlocks')
        .select('company_id,fields')
        .eq('user_id', user.id)
        .in('company_id', companyIds)
      for (const u of unlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []
    }

    // Step 4: Normalize leads
    const normalized = leads.map(lead => {
      const c = lead.company_id ? companyMap[lead.company_id] : null
      const uf = lead.company_id ? (unlockMap[lead.company_id] ?? []) : []
      return {
        ...lead,
        display_name:    lead.company_name || c?.name || '—',
        display_city:    lead.city    || c?.city    || null,
        display_sector:  lead.sector  || c?.primary_sector || null,
        display_phone:   lead.phone   || c?.phone_1 || null,
        display_email:   lead.email   || c?.email   || null,
        display_website: lead.website || c?.website || null,
        display_director:lead.contact_name || c?.director || null,
        display_ice:     c?.ice   || null,
        display_address: c?.address_raw || null,
        display_capital: c?.capital || null,
        display_annee:   c?.annee_creation || null,
        display_facebook:c?.facebook || null,
        display_activities: c?.activities ?? null,
        unlocked_fields: uf,
      }
    })

    // Filter by search query client-side
    const filtered = q
      ? normalized.filter(l =>
          l.display_name?.toLowerCase().includes(q) ||
          l.display_city?.toLowerCase().includes(q) ||
          l.display_sector?.toLowerCase().includes(q)
        )
      : normalized

    // Status counts (from ALL leads, not filtered)
    const { data: allLeads } = await supabaseAdmin
      .from('crm_leads').select('status').eq('user_id', user.id)
    const counts: Record<string, number> = {}
    for (const l of allLeads ?? []) counts[l.status] = (counts[l.status] ?? 0) + 1

    return NextResponse.json({ leads: filtered, counts })
  } catch (e) {
    console.error('CRM GET error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const companyIds: string[] = body.company_ids ?? []
    if (!companyIds.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id,name,city,phone_1,email,website,director,primary_sector')
      .in('id', companyIds)

    const map: Record<string, Record<string, string | null>> = {}
    for (const c of companies ?? []) map[c.id] = c as Record<string, string | null>

    // Check already in CRM
    const { data: existing } = await supabaseAdmin
      .from('crm_leads').select('company_id').eq('user_id', user.id).in('company_id', companyIds)
    const already = new Set((existing ?? []).map(l => l.company_id as string))

    const toInsert = companyIds.filter(id => !already.has(id))
    if (!toInsert.length) return NextResponse.json({ added: 0, skipped: already.size, message: 'Déjà dans le CRM' })

    const leads = toInsert.map(id => ({
      user_id: user.id, source: 'data', company_id: id,
      company_name: map[id]?.name ?? null,
      phone: map[id]?.phone_1 ?? null,
      email: map[id]?.email ?? null,
      website: map[id]?.website ?? null,
      contact_name: map[id]?.director ?? null,
      city: map[id]?.city ?? null,
      sector: map[id]?.primary_sector ?? null,
      status: 'to_call', priority: 'normal',
    }))

    const { data: inserted, error } = await supabaseAdmin.from('crm_leads').insert(leads).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ added: inserted?.length ?? 0, skipped: already.size, message: `${inserted?.length ?? 0} lead(s) ajouté(s)` })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
