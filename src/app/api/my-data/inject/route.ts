export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { company_ids } = await request.json()
    if (!company_ids?.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    // Fetch company data — no need to verify unlocks, just inject what they asked for
    const { data: companies, error: fetchErr } = await supabaseAdmin
      .from('companies')
      .select('id,name,city,phone_1,email,website,director,primary_sector,forme_juridique,annee_creation,ice')
      .in('id', company_ids)

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!companies?.length) return NextResponse.json({ error: 'Entreprises introuvables' }, { status: 404 })

    // Check already in CRM to avoid duplicates
    const { data: existing } = await supabaseAdmin
      .from('crm_leads').select('company_id')
      .eq('user_id', user.id).in('company_id', company_ids)
    const alreadyIn = new Set((existing ?? []).map(l => l.company_id as string))

    const toInject = companies.filter(c => !alreadyIn.has(c.id))
    if (!toInject.length) return NextResponse.json({
      injected: 0, skipped: alreadyIn.size,
      message: `Toutes ces entreprises sont déjà dans votre CRM`
    })

    const leads = toInject.map(c => ({
      user_id:      user.id,
      source:       'data',
      company_id:   c.id,
      company_name: c.name,           // ← ALWAYS set from companies.name
      phone:        c.phone_1 ?? null,
      email:        c.email ?? null,
      website:      c.website ?? null,
      contact_name: c.director ?? null,
      city:         c.city ?? null,
      country:      'Maroc',
      sector:       c.primary_sector ?? null,
      status:       'to_call',
      priority:     'normal',
      custom_fields: {
        forme_juridique: c.forme_juridique ?? '',
        annee_creation: c.annee_creation ?? '',
        ice: c.ice ?? '',
      },
    }))

    const { data: inserted, error } = await supabaseAdmin.from('crm_leads').insert(leads).select('id')
    if (error) {
      console.error('CRM inject error:', error)
      return NextResponse.json({ error: 'Erreur injection: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({
      injected: inserted?.length ?? 0,
      skipped:  alreadyIn.size,
      message:  `${inserted?.length ?? 0} entreprise${(inserted?.length ?? 0) > 1 ? 's' : ''} injectée${(inserted?.length ?? 0) > 1 ? 's' : ''} dans le CRM ✓`
    })
  } catch (e) {
    console.error('Inject error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
