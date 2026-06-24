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

    // Verify user owns these unlocks
    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks')
      .select('company_id')
      .eq('user_id', user.id)
      .in('company_id', company_ids)

    const ownedIds = new Set((unlocks ?? []).map(u => u.company_id))
    const validIds = company_ids.filter((id: string) => ownedIds.has(id))

    if (!validIds.length) return NextResponse.json({ error: 'Aucune entreprise déverrouillée trouvée' }, { status: 403 })

    // Fetch company data
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, city, phone_1, email, website, director, activities, forme_juridique, annee_creation, ice')
      .in('id', validIds)

    if (!companies?.length) return NextResponse.json({ error: 'Entreprises introuvables' }, { status: 404 })

    // Check for already-injected companies (avoid duplicates)
    const { data: existing } = await supabaseAdmin
      .from('crm_leads')
      .select('company_id')
      .eq('user_id', user.id)
      .in('company_id', validIds)

    const alreadyInCRM = new Set((existing ?? []).map(l => l.company_id))

    const toInject = companies.filter(c => !alreadyInCRM.has(c.id))

    if (!toInject.length) {
      return NextResponse.json({
        injected: 0,
        skipped: alreadyInCRM.size,
        message: 'Toutes ces entreprises sont déjà dans votre CRM',
      })
    }

    const leads = toInject.map(c => ({
      user_id:      user.id,
      source:       'data',
      company_id:   c.id,
      company_name: c.name,
      phone:        c.phone_1 ?? null,
      email:        c.email   ?? null,
      website:      c.website ?? null,
      contact_name: c.director ?? null,
      city:         c.city ?? null,
      country:      'Maroc',
      sector:       Array.isArray(c.activities) ? (c.activities[0] ?? null) : null,
      status:       'to_call',
      priority:     'normal',
      custom_fields: {
        forme_juridique: c.forme_juridique ?? '',
        annee_creation:  c.annee_creation  ?? '',
        ice:             c.ice             ?? '',
      },
    }))

    const { error: insertErr } = await supabaseAdmin
      .from('crm_leads')
      .insert(leads)

    if (insertErr) {
      console.error('CRM inject error:', insertErr)
      return NextResponse.json({ error: 'Erreur injection CRM: ' + insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      injected: toInject.length,
      skipped:  alreadyInCRM.size,
      message:  `${toInject.length} entreprise${toInject.length > 1 ? 's' : ''} injectée${toInject.length > 1 ? 's' : ''} dans le CRM`,
    })
  } catch (e) {
    console.error('Inject error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
