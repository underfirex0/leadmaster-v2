export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAvailableCities } from '@/lib/companiesV2'

export async function GET() {
  try {
    const cities = await getAvailableCities()
    return NextResponse.json(cities, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    })
  } catch (e) {
    console.error('Cities v2 error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
