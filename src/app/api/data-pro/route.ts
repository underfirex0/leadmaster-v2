export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: datasets, error } = await supabaseAdmin
      .from('datasets')
      .select('id, name, description, sector_tag, credit_cost, record_count, cover_emoji, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error

    const { data: unlocks } = await supabaseAdmin
      .from('dataset_unlocks').select('dataset_id').eq('user_id', user.id)
    const unlockedIds = new Set((unlocks ?? []).map(u => u.dataset_id as string))

    const result = (datasets ?? []).map(d => ({ ...d, is_unlocked: unlockedIds.has(d.id as string) }))
    return NextResponse.json({ datasets: result })
  } catch (e) {
    console.error('DATA Pro catalog error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
