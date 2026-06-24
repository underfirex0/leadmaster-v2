export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { sectors = [], domaines = [], activites = [], cities = [], name = '' } = await request.json()

    const { data, error } = await supabaseAdmin.rpc('count_companies_v2', {
      p_sectors:   sectors.length   ? sectors   : null,
      p_domaines:  domaines.length  ? domaines  : null,
      p_activites: activites.length ? activites : null,
      p_rub_slugs: null,
      p_cities:    cities.length    ? cities    : null,
      p_name:      name.trim()      || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const count = Number(data) || 0
    return NextResponse.json({ count, costPerCompany: 1, estimatedCost: count })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
