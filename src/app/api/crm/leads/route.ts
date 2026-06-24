export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { CRMStatus } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as CRMStatus | null

    let query = supabaseAdmin
      .from('crm_leads')
      .select('*, call_logs:crm_call_logs(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: leads, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!leads?.length) return NextResponse.json({ leads: [], counts: {} })

    // Split by source — search-sourced leads go through the company-join +
    // credit-unlock masking pipeline. Import-sourced leads are shown as-is.
    const searchLeads = leads.filter(l => l.source !== 'import' && l.company_id)
    const importLeads = leads.filter(l => l.source === 'import')

    // ── Search-sourced leads ──────────────────────────────────────────────
    const bizIds = [...new Set(searchLeads.map(l => l.company_id).filter(Boolean))] as string[]

    const { data: companies } = bizIds.length
      ? await supabaseAdmin.from('companies').select('*').in('id', bizIds)
      : { data: [] as Record<string, unknown>[] }

    const { data: unlockData } = bizIds.length
      ? await supabaseAdmin.from('company_unlocks')
          .select('company_id').eq('user_id', user.id).in('company_id', bizIds)
      : { data: [] as { company_id: string }[] }

    const unlockedSet = new Set((unlockData ?? []).map(u => u.company_id))

    const enrichedSearch = searchLeads.map(lead => {
      const raw = (companies?.find(b => b.id === lead.company_id) ?? null) as Record<string, unknown> | null
      const isUnlocked = unlockedSet.has(lead.company_id as string)

      if (!raw) return { ...lead, business: null }

      const p = <T>(v: unknown) => (isUnlocked ? (v as T) ?? null : null)

      return {
        ...lead,
        business: {
          id:             raw.id,
          name:           raw.name,
          sector:         Array.isArray(raw.activities) && (raw.activities as string[]).length > 0
                            ? (raw.activities as string[])[0]
                            : null,
          city:           raw.city,
          country:        null,
          phone:          p<string>(raw.phone_1),
          phone_2:        p<string>(raw.phone_2),
          email:          p<string>(raw.email),
          website:        p<string>(raw.website),
          address:        p<string>(raw.address_raw),
          dirigeant_name: p<string>(raw.director),
          dirigeant_phone: null,
          dirigeant_email: null,
          effectif_label:  null,
          revenue_label:   null,
          ice:            p<string>(raw.ice),
          rc:             p<string>(raw.rc),
          capital:        p<string>(raw.capital),
          facebook:       p<string>(raw.facebook),
          instagram:      p<string>(raw.instagram),
          linkedin:       p<string>(raw.linkedin),
          youtube:        p<string>(raw.youtube),
          unlocked: {},
          _unlocked: isUnlocked,
        },
      }
    })

    // ── Import-sourced leads: normalize to the SAME shape as `business`
    // so the frontend table/detail rendering works identically, just
    // with everything always visible (no locked fields, no unlock cost). ──
    const enrichedImport = importLeads.map(lead => ({
      ...lead,
      business: {
        id: null,
        name:            lead.company_name,
        phone:           lead.phone,
        email:           lead.email,
        website:         lead.website,
        address:         null,
        city:            lead.city,
        country:         lead.country ?? 'N/A',
        sector:          lead.sector,
        dirigeant_name:  lead.contact_name,
        dirigeant_phone: null,
        dirigeant_email: null,
        effectif_label:  null,
        revenue_label:   null,
        legal_form:      null,
        unlocked: {},
        _unlocked: true,
      },
    }))

    const enriched = [...enrichedSearch, ...enrichedImport]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    // Status counts (across ALL leads, both sources)
    const { data: allLeads } = await supabaseAdmin
      .from('crm_leads').select('status').eq('user_id', user.id)
    const counts: Record<string, number> = {}
    allLeads?.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1 })

    return NextResponse.json({ leads: enriched, counts })
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

    const { businessIds, queryId } = await request.json()
    if (!businessIds?.length) return NextResponse.json({ error: 'businessIds requis' }, { status: 400 })

    const records = businessIds.map((bid: string) => ({
      user_id: user.id, company_id: bid, source: 'search',
      query_id: queryId || null, status: 'to_call',
    }))

    const { data, error } = await supabaseAdmin
      .from('crm_leads')
      .upsert(records, { onConflict: 'user_id,company_id', ignoreDuplicates: true })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      added: data?.length ?? 0,
      total: businessIds.length,
      message: `${data?.length ?? 0} lead(s) ajouté(s) au CRM`,
    })
  } catch (e) {
    console.error('CRM POST error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
