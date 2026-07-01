export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { STANDARD_FIELDS } from '@/lib/dataProConstants'

type P = { params: { id: string } }
const BATCH = 500

export async function GET(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: unlock } = await supabaseAdmin
      .from('dataset_unlocks').select('id').eq('user_id', user.id).eq('dataset_id', params.id).maybeSingle()
    if (!unlock) return NextResponse.json({ error: 'Dataset non déverrouillé' }, { status: 403 })

    const { data: dataset } = await supabaseAdmin
      .from('datasets').select('name, field_schema').eq('id', params.id).single()
    if (!dataset) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const extraFields = (dataset.field_schema as { key: string; label: string }[]) ?? []

    const rows: Record<string, unknown>[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('dataset_companies').select('*').eq('dataset_id', params.id)
        .range(offset, offset + BATCH - 1).order('name')
      if (error || !data?.length) break
      rows.push(...data)
      if (data.length < BATCH) break
      offset += BATCH
    }

    const stdCols = ['name', 'city', ...STANDARD_FIELDS.map(f => f.key)]
    const stdLabels: Record<string, string> = { name: 'Raison sociale', city: 'Ville', ...Object.fromEntries(STANDARD_FIELDS.map(f => [f.key, f.label])) }

    const header = [...stdCols.map(c => stdLabels[c] ?? c), ...extraFields.map(f => f.label)].join(',')
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csvRows = rows.map(r => {
      const extra = (r.extra_fields as Record<string, unknown>) ?? {}
      return [...stdCols.map(c => esc(r[c])), ...extraFields.map(f => esc(extra[f.key]))].join(',')
    })

    const csv = '\uFEFF' + [header, ...csvRows].join('\n')
    const safeName = (dataset.name as string).replace(/[^a-z0-9]/gi, '-').toLowerCase()
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leadmaster-pro-${safeName}.csv"`,
      },
    })
  } catch (e) {
    console.error('DATA Pro export error:', e)
    return NextResponse.json({ error: 'Erreur export' }, { status: 500 })
  }
}
