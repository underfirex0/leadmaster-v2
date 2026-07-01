export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type P = { params: { id: string; companyId: string } }

export async function DELETE(req: NextRequest, { params }: P) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('dataset_companies').delete().eq('id', params.companyId).eq('dataset_id', params.id)
    if (error) throw error

    const { data: ds } = await supabaseAdmin.from('datasets').select('record_count').eq('id', params.id).single()
    await supabaseAdmin.from('datasets').update({ record_count: Math.max(0, (ds?.record_count ?? 1) - 1) }).eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
