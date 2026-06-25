export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const FIELD_COSTS: Record<string, number> = {
  phone: 1, email: 1, website: 1, director: 1, legal: 2, address: 1, social: 1,
}
const FIELD_COLUMNS: Record<string, string[]> = {
  phone:    ['phone_1','phone_2'],
  email:    ['email'],
  website:  ['website'],
  director: ['director'],
  legal:    ['ice','rc','capital','forme_juridique'],
  address:  ['address_raw','latitude','longitude'],
  social:   ['facebook','instagram','linkedin','youtube'],
}

function costPerCompany(fields: string[]): number {
  return fields.reduce((s, f) => s + (FIELD_COSTS[f] ?? 0), 0)
}
function completenessScore(c: Record<string, unknown>, fields: string[]): number {
  let score = 0
  for (const f of fields) {
    const cols = FIELD_COLUMNS[f] ?? []
    if (cols.some(col => c[col] != null && c[col] !== '')) score++
  }
  return score
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const {
      sectors = [], domaines = [], activites = [],
      cities = [], name = '',
      fields = ['phone', 'email'],
      limit = 50,
    } = body

    if (!fields.length) return NextResponse.json({ error: 'Sélectionnez au moins un champ' }, { status: 400 })

    // ── Fetch matching companies ─────────────────────────────
    let q = supabaseAdmin.from('companies').select(
      'id,name,city,annee_creation,forme_juridique,primary_sector,primary_domaine,primary_activite,activities,' +
      'phone_1,phone_2,email,website,director,ice,rc,capital,address_raw,latitude,longitude,' +
      'facebook,instagram,linkedin,youtube,description,rating,review_count,is_recommended,logo_url'
    )
    const hasNomen = sectors.length || domaines.length || activites.length
    if (hasNomen) {
      const parts: string[] = []
      if (sectors.length)   parts.push(`primary_sector.in.(${sectors.map((s: string) => `"${s}"`).join(',')})`)
      if (domaines.length)  parts.push(`primary_domaine.in.(${domaines.map((s: string) => `"${s}"`).join(',')})`)
      if (activites.length) parts.push(`primary_activite.in.(${activites.map((s: string) => `"${s}"`).join(',')})`)
      q = q.or(parts.join(','))
    }
    if (cities.length) q = q.in('city', cities)
    if (name.trim())   q = q.ilike('name', `%${name.trim()}%`)

    const { data: rawCompanies, error: fetchErr } = await q.limit(limit * 3)
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const companies = (rawCompanies ?? []) as Record<string, unknown>[]
    // Sort: companies with most data for selected fields come first
    companies.sort((a, b) => completenessScore(b, fields) - completenessScore(a, fields))
    const selected = companies.slice(0, limit)
    if (!selected.length) return NextResponse.json({ error: 'Aucune entreprise trouvée' }, { status: 404 })

    const companyIds = selected.map(c => c.id as string)

    // ── Check existing unlocks ───────────────────────────────
    const { data: existingUnlocks } = await supabaseAdmin
      .from('company_unlocks').select('company_id,fields')
      .eq('user_id', user.id).in('company_id', companyIds)
    const unlockMap: Record<string, string[]> = {}
    for (const u of existingUnlocks ?? []) unlockMap[u.company_id] = (u.fields as string[]) ?? []

    // ── Calculate cost ────────────────────────────────────────
    let totalCost = 0
    for (const company of selected) {
      const cid = company.id as string
      const already = unlockMap[cid] ?? []
      const newFields = fields.filter((f: string) => !already.includes(f))
      totalCost += costPerCompany(newFields)
    }

    // ── Check balance ─────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()
    const balance = profile?.credit_balance ?? 0
    if (totalCost > balance) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût: ${totalCost} cr, solde: ${balance} cr`,
        required: totalCost, available: balance,
      }, { status: 402 })
    }

    // ── Deduct credits ────────────────────────────────────────
    if (totalCost > 0) {
      await supabaseAdmin.from('profiles')
        .update({ credit_balance: balance - totalCost }).eq('id', user.id)
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id, amount: -totalCost,
        balance_after: balance - totalCost, type: 'unlock',
        description: `${selected.length} entreprises · champs: ${fields.join(', ')}`,
      })
    }

    // ── Save company_unlocks (no query_id here — just track unlocks) ──
    const unlockRows = selected.map(company => {
      const cid = company.id as string
      const existing = unlockMap[cid] ?? []
      const merged = [...new Set([...existing, ...fields])]
      return { user_id: user.id, company_id: cid, credits_spent: costPerCompany(fields), fields: merged }
    })
    await supabaseAdmin.from('company_unlocks')
      .upsert(unlockRows, { onConflict: 'user_id,company_id' })

    // ── Save query WITH company_ids array ─────────────────────
    // This is the source of truth for "which companies are in this search"
    const { data: queryRecord, error: queryErr } = await supabaseAdmin.from('queries').insert({
      user_id:          user.id,
      filters:          { sectors, domaines, activites, cities, name },
      fields_requested: fields,
      result_count:     selected.length,
      credits_spent:    totalCost,
      company_ids:      companyIds,   // ← Store the actual company IDs
      query_name:       null,
    }).select().single()

    if (queryErr) {
      console.error('Query insert error:', queryErr)
      // Non-blocking: unlocks already done, just return success without queryId
      return NextResponse.json({
        queryId: null, companiesUnlocked: selected.length,
        creditsSpent: totalCost, newBalance: balance - totalCost,
      })
    }

    return NextResponse.json({
      queryId:           queryRecord.id,
      companiesUnlocked: selected.length,
      creditsSpent:      totalCost,
      newBalance:        balance - totalCost,
    })
  } catch (e) {
    console.error('Execute error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
