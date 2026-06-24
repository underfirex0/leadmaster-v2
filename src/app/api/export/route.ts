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
    const queryId = searchParams.get('queryId')

    // Get query to know which fields were unlocked
    let fields: string[] = ['phone','email','website','director','legal','address','social']
    if (queryId) {
      const { data: q } = await supabaseAdmin.from('queries').select('fields_requested').eq('id', queryId).eq('user_id', user.id).single()
      if (q?.fields_requested?.length) fields = q.fields_requested as string[]
    }

    const { data: unlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id').eq('user_id', user.id)
    if (!unlocks?.length) return new NextResponse('', { headers: { 'Content-Type': 'text/csv' } })

    const ids = unlocks.map((u: { company_id: string }) => u.company_id)
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, city, primary_sector, annee_creation, phone_1, phone_2, email, website, director, ice, rc, capital, forme_juridique, address_raw, facebook, instagram, linkedin')
      .in('id', ids)

    const FIELD_COLS: Record<string, string[]> = {
      phone: ['phone_1','phone_2'], email: ['email'], website: ['website'],
      director: ['director'], legal: ['ice','rc','capital','forme_juridique'],
      address: ['address_raw'], social: ['facebook','instagram','linkedin'],
    }

    const fixedCols = ['name','city','primary_sector','annee_creation']
    const extraCols = fields.flatMap(f => FIELD_COLS[f] ?? [])
    const allCols   = [...fixedCols, ...extraCols]

    const LABELS: Record<string,string> = {
      name:'Raison sociale', city:'Ville', primary_sector:'Secteur', annee_creation:'Année création',
      phone_1:'Téléphone 1', phone_2:'Téléphone 2', email:'E-mail', website:'Site web',
      director:'Dirigeant', ice:'ICE', rc:'RC', capital:'Capital', forme_juridique:'Forme juridique',
      address_raw:'Adresse', facebook:'Facebook', instagram:'Instagram', linkedin:'LinkedIn',
    }

    const header = allCols.map(c => LABELS[c] ?? c).join(',')
    const rows = (companies ?? []).map(c => allCols.map(col => {
      const val = String((c as Record<string,unknown>)[col] ?? '')
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g,'""')}"` : val
    }).join(','))

    const csv = '\uFEFF' + [header, ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leadmaster-export.csv"`,
      }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur export' }, { status: 500 })
  }
}
