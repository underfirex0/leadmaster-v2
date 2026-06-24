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
    const q      = searchParams.get('q') ?? ''

    // Get all leads - join companies to always get the name
    let query = supabaseAdmin
      .from('crm_leads')
      .select(`
        id, user_id, source, company_id, company_name,
        phone, email, website, contact_name, city, country,
        sector, status, priority, notes, callback_date,
        last_contacted_at, status_changed_at, created_at, updated_at,
        companies(name, city, phone_1, phone_2, email, website, director,
                  ice, forme_juridique, primary_sector, address_raw,
                  facebook, instagram, linkedin)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)

    const { data: leads, error } = await query
    if (error) {
      console.error('CRM leads error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Normalize: always resolve company name from companies join if missing
    const normalized = (leads ?? []).map((lead: Record<string, unknown>) => {
      const company = lead.companies as Record<string, string> | null
      return {
        ...lead,
        companies: undefined,
        // Always show a name - company_name from lead, or from joined companies table
        display_name: (lead.company_name as string) || company?.name || '—',
        display_city: (lead.city as string) || company?.city || '—',
        display_sector: (lead.sector as string) || company?.primary_sector || '—',
        display_phone: (lead.phone as string) || company?.phone_1 || null,
        display_email: (lead.email as string) || company?.email || null,
        display_website: (lead.website as string) || company?.website || null,
        display_director: (lead.contact_name as string) || company?.director || null,
        display_ice: company?.ice || null,
        display_address: company?.address_raw || null,
        display_facebook: company?.facebook || null,
        display_instagram: company?.instagram || null,
      }
    }).filter((lead) => {
      if (!q) return true
      const qs = q.toLowerCase()
      return (
        lead.display_name?.toLowerCase().includes(qs) ||
        lead.display_city?.toLowerCase().includes(qs) ||
        lead.display_sector?.toLowerCase().includes(qs)
      )
    })

    // Status counts
    const { data: allLeads } = await supabaseAdmin
      .from('crm_leads').select('status').eq('user_id', user.id)
    const counts: Record<string, number> = {}
    ;(allLeads ?? []).forEach((l: { status: string }) => {
      counts[l.status] = (counts[l.status] || 0) + 1
    })

    return NextResponse.json({ leads: normalized, counts })
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
    const companyIds: string[] = body.company_ids || body.businessIds || []
    if (!companyIds.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    // Fetch company names
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, city, phone_1, email, website, director, primary_sector')
      .in('id', companyIds)

    const companyMap: Record<string, Record<string, string>> = {}
    for (const c of companies ?? []) companyMap[c.id] = c as unknown as Record<string, string>

    const records = companyIds.map((cid: string) => {
      const c = companyMap[cid] || {}
      return {
        user_id:      user.id,
        company_id:   cid,
        company_name: c.name || null,
        phone:        c.phone_1 || null,
        email:        c.email || null,
        website:      c.website || null,
        contact_name: c.director || null,
        city:         c.city || null,
        sector:       c.primary_sector || null,
        source:       'data',
        status:       'to_call',
        priority:     'normal',
      }
    })

    const { data, error } = await supabaseAdmin
      .from('crm_leads')
      .upsert(records, { onConflict: 'user_id,company_id', ignoreDuplicates: true })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ added: data?.length ?? 0, message: `${data?.length ?? 0} lead(s) ajouté(s) au CRM` })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
