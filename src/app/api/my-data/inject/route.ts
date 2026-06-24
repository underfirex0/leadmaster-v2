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
      .from('company_unlocks').select('company_id')
      .eq('user_id', user.id).in('company_id', company_ids)
    const owned = new Set((unlocks ?? []).map((u: { company_id: string }) => u.company_id))
    const valid = company_ids.filter((id: string) => owned.has(id))
    if (!valid.length) return NextResponse.json({ error: 'Aucune entreprise valide' }, { status: 403 })

    // Fetch companies with name explicitly
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, city, phone_1, email, website, director, primary_sector, forme_juridique, annee_creation, ice')
      .in('id', valid)

    // Check already in CRM
    const { data: existing } = await supabaseAdmin
      .from('crm_leads').select('company_id')
      .eq('user_id', user.id).in('company_id', valid)
    const alreadyIn = new Set((existing ?? []).map((l: { company_id: string }) => l.company_id))

    const toInject = (companies ?? []).filter((c: { id: string }) => !alreadyIn.has(c.id))
    if (!toInject.length) return NextResponse.json({ injected: 0, skipped: alreadyIn.size, message: 'Déjà dans le CRM' })

    const leads = toInject.map((c: Record<string, string | null>) => ({
      user_id:      user.id,
      source:       'data',
      company_id:   c.id,
      company_name: c.name,          // ← ALWAYS set from companies.name
      phone:        c.phone_1 ?? null,
      email:        c.email ?? null,
      website:      c.website ?? null,
      contact_name: c.director ?? null,
      city:         c.city ?? null,
      country:      'Maroc',
      sector:       c.primary_sector ?? null,
      status:       'to_call',
      priority:     'normal',
      custom_fields: { forme_juridique: c.forme_juridique ?? '', annee_creation: c.annee_creation ?? '', ice: c.ice ?? '' },
    }))

    const { error } = await supabaseAdmin.from('crm_leads').insert(leads)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      injected: toInject.length,
      skipped:  alreadyIn.size,
      message:  `${toInject.length} entreprise${toInject.length > 1 ? 's' : ''} injectée${toInject.length > 1 ? 's' : ''} dans le CRM`,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
