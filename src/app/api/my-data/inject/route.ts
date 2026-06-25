export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const CHUNK = 500

async function chunkIn<T>(
  table: string,
  selectCols: string,
  ids: string[],
  matchCol: string,
  extraFilters?: (q: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    let q = supabaseAdmin.from(table).select(selectCols).in(matchCol, slice)
    if (extraFilters) q = extraFilters(q as ReturnType<typeof supabaseAdmin.from>) as typeof q
    const { data } = await q.limit(CHUNK)
    results.push(...(data ?? []))
  }
  return results
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { company_ids } = await request.json()
    if (!company_ids?.length) return NextResponse.json({ error: 'company_ids requis' }, { status: 400 })

    // ── Fetch all company data in chunks ─────────────────────
    const companies = await chunkIn<{
      id:string; name:string; city:string|null; phone_1:string|null
      email:string|null; website:string|null; director:string|null
      primary_sector:string|null; forme_juridique:string|null
      annee_creation:string|null; ice:string|null
    }>(
      'companies',
      'id,name,city,phone_1,email,website,director,primary_sector,forme_juridique,annee_creation,ice',
      company_ids, 'id'
    )

    if (!companies.length) return NextResponse.json({ error: 'Entreprises introuvables' }, { status: 404 })

    // ── Check already in CRM in chunks ───────────────────────
    const existingRows = await chunkIn<{company_id:string}>(
      'crm_leads', 'company_id', company_ids, 'company_id',
      q => q.eq('user_id', user.id)
    )
    const alreadyIn = new Set(existingRows.map(r => r.company_id))

    const toInject = companies.filter(c => !alreadyIn.has(c.id))
    if (!toInject.length) {
      return NextResponse.json({
        injected: 0, skipped: alreadyIn.size,
        message: `Toutes ces entreprises sont déjà dans votre CRM (${alreadyIn.size})`
      })
    }

    // ── Insert in batches of 500 ─────────────────────────────
    let totalInjected = 0
    let totalErrors   = 0

    for (let i = 0; i < toInject.length; i += CHUNK) {
      const chunk = toInject.slice(i, i + CHUNK)
      const leads = chunk.map(c => ({
        user_id:       user.id,
        source:        'data',
        company_id:    c.id,
        company_name:  c.name,
        phone:         c.phone_1  ?? null,
        email:         c.email    ?? null,
        website:       c.website  ?? null,
        contact_name:  c.director ?? null,
        city:          c.city     ?? null,
        country:       'Maroc',
        sector:        c.primary_sector ?? null,
        status:        'to_call',
        priority:      'normal',
        custom_fields: {
          forme_juridique: c.forme_juridique ?? '',
          annee_creation:  c.annee_creation  ?? '',
          ice:             c.ice             ?? '',
        },
      }))

      const { data: inserted, error } = await supabaseAdmin
        .from('crm_leads').insert(leads).select('id')

      if (error) {
        console.error(`CRM inject batch ${i} error:`, error.message)
        totalErrors += chunk.length
      } else {
        totalInjected += inserted?.length ?? 0
      }
    }

    const msg = totalErrors > 0
      ? `${totalInjected} injectées, ${totalErrors} erreurs, ${alreadyIn.size} déjà dans CRM`
      : `${totalInjected} entreprise${totalInjected > 1 ? 's' : ''} injectée${totalInjected > 1 ? 's' : ''} dans le CRM ✓`

    return NextResponse.json({
      injected: totalInjected,
      skipped:  alreadyIn.size,
      errors:   totalErrors,
      message:  msg,
    })
  } catch (e) {
    console.error('Inject error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
