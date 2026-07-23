import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      request_type = 'file_upload',
      file_name, file_path, file_size_bytes, estimated_rows,
      request_description,
      user_notes,
    } = body

    if (request_type === 'file_upload' && (!file_name || !file_path)) {
      return NextResponse.json({ error: 'file_name et file_path sont requis' }, { status: 400 })
    }
    if (request_type === 'custom_request' && !request_description?.trim()) {
      return NextResponse.json({ error: 'Merci de décrire les données que vous recherchez' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('data_upload_requests')
      .insert({
        user_id:              session.user.id,
        request_type,
        file_name:            file_name ?? null,
        file_path:            file_path ?? null,
        file_size_bytes:      file_size_bytes ?? null,
        estimated_rows:       estimated_rows  ?? null,
        request_description:  request_description ?? null,
        user_notes:           user_notes ?? null,
        status:               'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    // Log activity (non-blocking — never let a logging failure break the request)
    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: session.user.id,
        action:  request_type === 'custom_request' ? 'custom_data_request' : 'data_upload_request',
        details: { request_id: data.id, file_name, request_description },
      })
    } catch {
      // Table may not exist or insert failed — ignore, this is non-critical
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
