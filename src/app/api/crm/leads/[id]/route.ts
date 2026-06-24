export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { status, priority, notes, callback_date } = body

    const { data: lead } = await supabaseAdmin
      .from('crm_leads').select('*').eq('id', params.id).eq('user_id', user.id).single()
    if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined)        { updateData.status = status; updateData.status_changed_at = new Date().toISOString() }
    if (priority !== undefined)      updateData.priority = priority
    if (notes !== undefined)         updateData.notes = notes
    if (callback_date !== undefined) updateData.callback_date = callback_date

    const { data: updated, error } = await supabaseAdmin
      .from('crm_leads').update(updateData).eq('id', params.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lead: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { error } = await supabaseAdmin.from('crm_leads').delete().eq('id', params.id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
