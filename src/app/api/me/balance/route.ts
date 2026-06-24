export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()

    return NextResponse.json({ balance: data?.credit_balance ?? 0 })
  } catch {
    return NextResponse.json({ balance: 0 })
  }
}
