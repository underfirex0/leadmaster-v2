export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type P = { params: { id: string } }
const BATCH = 500

async function fetchAllWithRange(
  buildQuery: (offset: number, end: number) => ReturnType<typeof supabaseAdmin.from>
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let offset = 0
  while (true) {
    const { data, error } = await buildQuery(offset, offset + BATCH - 1) as unknown as { data: Record<string,unknown>[] | null, error: unknown }
    if (error || !data?.length) break
    all.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }
  return all
}

export async function GET(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: dataset, error: dErr } = await supabaseAdmin
      .from('datasets').select('*').eq('id', params.id).eq('is_active', true).single()
    if (dErr || !dataset) return NextResponse.json({ error: 'Dataset introuvable' }, { status: 404 })

    const { data: unlock } = await supabaseAdmin
      .from('dataset_unlocks').select('id, unlocked_at, credits_spent')
      .eq('user_id', user.id).eq('dataset_id', params.id).maybeSingle()

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()

    if (!unlock) {
      // Not purchased — return a blurred preview only (first 5 rows, name/city only)
      const { data: preview } = await supabaseAdmin
        .from('dataset_companies')
        .select('id, name, city, primary_sector')
        .eq('dataset_id', params.id)
        .limit(5)

      return NextResponse.json({
        dataset, unlocked: false, companies: [],
        preview: preview ?? [], balance: profile?.credit_balance ?? 0,
      })
    }

    const companies = await fetchAllWithRange((offset, end) =>
      supabaseAdmin
        .from('dataset_companies')
        .select('*')
        .eq('dataset_id', params.id)
        .range(offset, end)
        .order('name')
    )

    return NextResponse.json({
      dataset, unlocked: true, companies,
      balance: profile?.credit_balance ?? 0,
    })
  } catch (e) {
    console.error('DATA Pro detail error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
