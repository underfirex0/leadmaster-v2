export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Fetches saved query results by queryId (for /databases page)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const queryId = searchParams.get('queryId')
    if (!queryId) return NextResponse.json({ error: 'queryId requis' }, { status: 400 })

    const { data: query } = await supabaseAdmin
      .from('queries')
      .select('*')
      .eq('id', queryId)
      .eq('user_id', user.id)
      .single()

    if (!query) return NextResponse.json({ error: 'Recherche introuvable' }, { status: 404 })

    return NextResponse.json({ query, filters: query.filters ?? {} })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
