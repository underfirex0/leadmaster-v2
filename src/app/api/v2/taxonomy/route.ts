export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTaxonomyTree } from '@/lib/companiesV2'

export async function GET() {
  try {
    const tree = await getTaxonomyTree()
    return NextResponse.json(tree, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    })
  } catch (e) {
    console.error('Taxonomy v2 error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
