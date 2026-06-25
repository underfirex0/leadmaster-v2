export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

let cache: string[] | null = null
let cacheTs = 0

export async function GET() {
  try {
    if (cache && Date.now() - cacheTs < 3600000) return NextResponse.json({ cities: cache })

    // Paginate to bypass Supabase 1000-row cap and get ALL distinct cities
    const allCityData: string[] = []
    let offset = 0
    while (true) {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('city')
        .not('city', 'is', null)
        .neq('city', '')
        .order('city')
        .range(offset, offset + 999)
      if (!data?.length) break
      allCityData.push(...data.map((r: { city: string }) => r.city).filter(Boolean))
      if (data.length < 1000) break
      offset += 1000
    }

    const cities = [...new Set(allCityData)].sort()
    cache = cities
    cacheTs = Date.now()
    return NextResponse.json({ cities })
  } catch {
    return NextResponse.json({ cities: [] })
  }
}
