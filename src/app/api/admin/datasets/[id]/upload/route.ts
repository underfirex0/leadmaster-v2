export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import { HEADER_ALIASES, normalizeHeader, guessFieldType, type FieldSchemaEntry, type StandardFieldKey } from '@/lib/dataProConstants'

type P = { params: { id: string } }
const BATCH = 500

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Accès interdit' }, { status: 403 }) }
  return { user }
}

function slugify(h: string): string {
  return h
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'field'
}

export async function POST(req: NextRequest, { params }: P) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { data: dataset } = await supabaseAdmin.from('datasets').select('id, field_schema, record_count').eq('id', params.id).single()
    if (!dataset) return NextResponse.json({ error: 'Dataset introuvable' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })

    if (!rows.length) return NextResponse.json({ error: 'Fichier vide ou illisible' }, { status: 400 })

    const rawHeaders = Object.keys(rows[0])
    // Map each header → { type: 'standard', col } | { type: 'extra', key, label }
    const headerMap: Record<string, { std?: StandardFieldKey; extraKey?: string; label: string }> = {}
    for (const h of rawHeaders) {
      const norm = normalizeHeader(h)
      const std = HEADER_ALIASES[norm]
      if (std) headerMap[h] = { std, label: h }
      else headerMap[h] = { extraKey: slugify(h), label: h.trim() }
    }

    // Build extra field_schema entries (merge with existing)
    const existingSchema: FieldSchemaEntry[] = (dataset.field_schema as FieldSchemaEntry[]) ?? []
    const existingKeys = new Set(existingSchema.map(f => f.key))
    const newSchema: FieldSchemaEntry[] = [...existingSchema]

    for (const h of rawHeaders) {
      const map = headerMap[h]
      if (map.extraKey && !existingKeys.has(map.extraKey)) {
        const values = rows.map(r => r[h])
        newSchema.push({ key: map.extraKey, label: map.label, type: guessFieldType(values) })
        existingKeys.add(map.extraKey)
      }
    }

    // Build insertable rows
    const insertRows = rows.map(r => {
      const row: Record<string, unknown> = { dataset_id: params.id, extra_fields: {} }
      const extra: Record<string, unknown> = {}
      for (const h of rawHeaders) {
        const map = headerMap[h]
        const val = r[h]
        const cleanVal = val === '' || val === undefined ? null : val
        if (map.std) row[map.std] = cleanVal
        else if (map.extraKey && cleanVal !== null) extra[map.extraKey] = cleanVal
      }
      row.extra_fields = extra
      if (!row.name) row.name = row.director ? String(row.director) : 'Sans nom'
      return row
    }).filter(r => r.name && r.name !== 'Sans nom' || Object.keys(r.extra_fields as object).length > 0)

    let inserted = 0
    for (let i = 0; i < insertRows.length; i += BATCH) {
      const chunk = insertRows.slice(i, i + BATCH)
      const { data, error } = await supabaseAdmin.from('dataset_companies').insert(chunk).select('id')
      if (error) { console.error('Dataset row insert error:', error.message); continue }
      inserted += data?.length ?? 0
    }

    const { data: updatedDataset } = await supabaseAdmin
      .from('datasets')
      .update({ field_schema: newSchema, record_count: (dataset.record_count ?? 0) + inserted })
      .eq('id', params.id).select('*').single()

    return NextResponse.json({
      success: true, inserted, total_rows: rows.length,
      mapped_standard: rawHeaders.filter(h => headerMap[h].std).length,
      mapped_extra: rawHeaders.filter(h => headerMap[h].extraKey).length,
      dataset: updatedDataset,
    })
  } catch (e) {
    console.error('Dataset upload error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
