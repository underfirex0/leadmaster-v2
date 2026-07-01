export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type P = { params: { id: string } }
const CHUNK = 500

export async function POST(request: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: unlock } = await supabaseAdmin
      .from('dataset_unlocks').select('id').eq('user_id', user.id).eq('dataset_id', params.id).maybeSingle()
    if (!unlock) return NextResponse.json({ error: 'Dataset non déverrouillé' }, { status: 403 })

    const { company_ids } = await request.json()
    if (!company_ids?.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    const { data: dataset } = await supabaseAdmin.from('datasets').select('name, field_schema').eq('id', params.id).single()
    const fieldLabels: Record<string, string> = {}
    for (const f of (dataset?.field_schema as { key: string; label: string }[]) ?? []) fieldLabels[f.key] = f.label

    const companies: Record<string, unknown>[] = []
    for (let i = 0; i < company_ids.length; i += CHUNK) {
      const { data } = await supabaseAdmin
        .from('dataset_companies').select('*').eq('dataset_id', params.id).in('id', company_ids.slice(i, i + CHUNK))
      companies.push(...(data ?? []))
    }
    if (!companies.length) return NextResponse.json({ error: 'Entreprises introuvables' }, { status: 404 })

    // Dedupe against existing CRM leads sourced from this exact dataset row
    // (we key on company_name + dataset_row_id stored in custom_fields since
    // company_id FK points at `companies`, not `dataset_companies`).
    const { data: existingLeads } = await supabaseAdmin
      .from('crm_leads').select('custom_fields').eq('user_id', user.id).eq('source', 'data')
    const existingRowIds = new Set(
      (existingLeads ?? [])
        .map(l => (l.custom_fields as Record<string, unknown> | null)?.dataset_row_id)
        .filter(Boolean)
    )

    const toInject = companies.filter(c => !existingRowIds.has(c.id))
    if (!toInject.length) {
      return NextResponse.json({ injected: 0, skipped: companies.length, message: 'Toutes ces entreprises sont déjà dans votre CRM' })
    }

    let totalInjected = 0
    for (let i = 0; i < toInject.length; i += CHUNK) {
      const chunk = toInject.slice(i, i + CHUNK)
      const leads = chunk.map(c => ({
        user_id: user.id,
        source: 'data',
        company_name: c.name,
        phone: c.phone_1 ?? null,
        email: c.email ?? null,
        website: c.website ?? null,
        contact_name: c.director ?? null,
        city: c.city ?? null,
        country: 'Maroc',
        sector: c.primary_sector ?? null,
        status: 'to_call',
        priority: 'normal',
        custom_fields: {
          dataset_row_id: c.id,
          dataset_id: params.id,
          dataset_name: dataset?.name ?? 'DATA Pro',
          is_pro: true,
          field_labels: fieldLabels,
          // Standard fields explicitly (crm_leads has no dedicated columns for these,
          // so we store them here — the CRM API reads them back out for is_pro leads).
          ice: c.ice ?? null,
          rc: c.rc ?? null,
          capital: c.capital ?? null,
          effectif: c.effectif ?? null,
          address_raw: c.address_raw ?? null,
          forme_juridique: c.forme_juridique ?? null,
          annee_creation: c.annee_creation ?? null,
          phone_2: c.phone_2 ?? null,
          // Everything dataset-specific (director contacts, financials, ESG, etc.)
          ...(c.extra_fields as Record<string, unknown> ?? {}),
        },
      }))
      const { data: inserted, error } = await supabaseAdmin.from('crm_leads').insert(leads).select('id')
      if (!error) totalInjected += inserted?.length ?? 0
      else console.error('DATA Pro inject batch error:', error.message)
    }

    return NextResponse.json({
      injected: totalInjected,
      skipped: companies.length - totalInjected,
      message: `${totalInjected} entreprise${totalInjected > 1 ? 's' : ''} injectée${totalInjected > 1 ? 's' : ''} dans le CRM ✓`,
    })
  } catch (e) {
    console.error('DATA Pro inject error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
