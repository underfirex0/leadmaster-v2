export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getTaxonomyTree } from '@/lib/companiesV2'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const citiesParam = searchParams.get('cities') ?? ''
    const cities = citiesParam ? citiesParam.split(',').filter(Boolean) : undefined

    const tree = await getTaxonomyTree(cities)
    return NextResponse.json(tree, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    })
  } catch (e) {
    console.error('Taxonomy v2 error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
