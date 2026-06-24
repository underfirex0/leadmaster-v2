export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

let cache: string[] | null = null
let cacheTs = 0

export async function GET() {
  try {
    if (cache && Date.now() - cacheTs < 3600000) return NextResponse.json({ cities: cache })
    const { data } = await supabaseAdmin
      .from('companies').select('city').not('city', 'is', null).order('city')
    const cities = [...new Set((data ?? []).map((r: { city: string }) => r.city).filter(Boolean))].sort()
    cache = cities; cacheTs = Date.now()
    return NextResponse.json({ cities })
  } catch { return NextResponse.json({ cities: [] }) }
}
