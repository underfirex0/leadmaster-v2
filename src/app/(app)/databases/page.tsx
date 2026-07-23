'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Clock, Download, Eye, Trash2, Loader2, Database, ArrowRight, Filter, Crown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Query = {
  id: string
  filters: { sectors?: string[]; domaines?: string[]; activites?: string[]; cities?: string[]; name?: string }
  fields_requested: string[]
  result_count: number
  credits_spent: number
  query_name: string | null
  created_at: string
}

type ProDataset = {
  id: string; name: string; sector_tag: string | null; record_count: number
  cover_emoji: string | null; credit_cost: number; is_unlocked: boolean
}

const FIELD_LABELS: Record<string, string> = {
  phone: 'Téléphone', email: 'E-mail', website: 'Site web',
  director: 'Dirigeant', legal: 'ICE + RC', address: 'Adresse', social: 'Réseaux',
}

function fmt(d: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export default function DatabasesPage() {
  const [queries, setQueries]   = useState<Query[]>([])
  const [proDatasets, setProDatasets] = useState<ProDataset[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/searches').then(r => r.json()).then(d => { setQueries(d.queries ?? []); setLoading(false) })
    fetch('/api/data-pro').then(r => r.json()).then(d => {
      setProDatasets((d.datasets ?? []).filter((ds: ProDataset) => ds.is_unlocked))
    }).catch(() => {})
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/searches/${id}`, { method: 'DELETE' })
    setQueries(prev => prev.filter(q => q.id !== id))
    setDeleting(null)
    showToast('Recherche supprimée')
  }

  async function handleCSV(q: Query) {
    const r = await fetch(`/api/export?queryId=${q.id}`)
    if (!r.ok) { showToast('Erreur export'); return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `leadmaster-${q.id.slice(0,8)}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('Export téléchargé ✓')
  }

  function describeFilters(q: Query) {
    const f = q.filters
    const parts: string[] = []
    if (f.sectors?.length)   parts.push(...f.sectors.slice(0, 2))
    if (f.domaines?.length)  parts.push(...f.domaines.slice(0, 2))
    if (f.activites?.length) parts.push(`${f.activites.length} activité${f.activites.length > 1 ? 's' : ''}`)
    if (f.cities?.length)    parts.push(...f.cities)
    if (f.name)              parts.push(`"${f.name}"`)
    return parts.length ? parts : ['Toutes les entreprises']
  }

  const totalCompanies = queries.reduce((s, q) => s + q.result_count, 0)
  const totalCredits   = queries.reduce((s, q) => s + q.credits_spent, 0)

  // ── Client-side filters ───────────────────────────────────
  const [qSearch, setQSearch]       = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')

  // Collect unique cities and sectors from saved queries
  const allCities   = useMemo(() => [...new Set(queries.flatMap(q => q.filters.cities ?? []))].sort(), [queries])
  const allSectors  = useMemo(() => [...new Set(queries.flatMap(q => q.filters.sectors ?? []))].sort(), [queries])

  const filteredQueries = useMemo(() => queries.filter(q => {
    const tags = describeFilters(q).join(' ').toLowerCase()
    if (qSearch && !tags.includes(qSearch.toLowerCase())) return false
    if (cityFilter && !(q.filters.cities ?? []).includes(cityFilter)) return false
    if (sectorFilter && !(q.filters.sectors ?? []).includes(sectorFilter)) return false
    return true
  }), [queries, qSearch, cityFilter, sectorFilter])

  const hasActiveFilter = qSearch || cityFilter || sectorFilter

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl text-[13px] font-medium shadow-xl">{toast}</div>}
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Mes recherches</h1>
            <p className="text-gray-500 text-[14px] mt-1">Retrouvez, re-visualisez et exportez toutes vos recherches passées.</p>
          </div>
          <Link href="/search" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-[13.5px] hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
            <Search className="w-4 h-4" /> Nouvelle recherche
          </Link>
        </div>

        {/* Stats */}
        {queries.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Recherches total', val: queries.length, icon: Database },
              { label: 'Entreprises trouvées', val: totalCompanies.toLocaleString('fr-FR'), icon: Filter },
              { label: 'Crédits dépensés', val: totalCredits.toLocaleString('fr-FR'), icon: Search },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-[22px] font-bold text-gray-900 font-mono">{s.val}</div>
                    <div className="text-[12px] text-gray-400">{s.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* DATA Pro purchased datasets */}
        {proDatasets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500" />
              <h2 className="text-[15px] font-bold text-gray-800">Mes datasets Pro</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {proDatasets.map(ds => (
                <Link key={ds.id} href={`/data-pro/${ds.id}`}
                  className="flex items-center gap-3 bg-gradient-to-br from-white to-amber-50/50 border border-amber-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="text-[24px]">{ds.cover_emoji || '💎'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[14px] text-gray-900 truncate">{ds.name}</span>
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5 shrink-0">PRO</span>
                    </div>
                    <div className="text-[12px] text-gray-400">{ds.record_count.toLocaleString('fr-FR')} entreprises{ds.sector_tag ? ` · ${ds.sector_tag}` : ''}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : queries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <Database className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-gray-700 text-[17px] mb-2">Aucune recherche effectuée</h3>
            <p className="text-gray-400 text-[14px] mb-6">Vos recherches apparaîtront ici avec toutes les données déverrouillées.</p>
            <Link href="/search" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] hover:bg-indigo-700">
              Commencer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={qSearch} onChange={e => setQSearch(e.target.value)}
                    placeholder="Rechercher une recherche..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-300 bg-gray-50/50" />
                </div>
                {allCities.length > 0 && (
                  <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-300 bg-white text-gray-600">
                    <option value="">Toutes les villes</option>
                    {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {allSectors.length > 0 && (
                  <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-300 bg-white text-gray-600 max-w-[200px] truncate">
                    <option value="">Tous les secteurs</option>
                    {allSectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                {hasActiveFilter && (
                  <button onClick={() => { setQSearch(''); setCityFilter(''); setSectorFilter('') }}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
                    <X className="w-3.5 h-3.5" /> Réinitialiser
                  </button>
                )}
                <span className="text-[12px] text-gray-400 ml-auto">
                  {filteredQueries.length} / {queries.length} recherche{queries.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

          <div className="space-y-3">
            {filteredQueries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <p className="text-gray-400 text-[14px]">Aucune recherche ne correspond aux filtres sélectionnés.</p>
                <button onClick={() => { setQSearch(''); setCityFilter(''); setSectorFilter('') }}
                  className="text-[13px] text-indigo-600 font-semibold mt-2 hover:underline">Réinitialiser les filtres</button>
              </div>
            ) : filteredQueries.map(q => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
                        <Clock className="w-3.5 h-3.5" />{fmt(q.created_at)}
                      </span>
                      <span className="text-[12px] font-bold text-gray-700 bg-gray-100 rounded-full px-2.5 py-0.5">
                        📋 {q.result_count.toLocaleString('fr-FR')} entreprises
                      </span>
                      <span className="text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">
                        ⚡ {q.credits_spent.toLocaleString('fr-FR')} cr dépensés
                        {q.result_count > 0 ? ` · ${Math.round(q.credits_spent / q.result_count)} cr/biz` : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {describeFilters(q).map((tag, i) => (
                        <span key={i} className="text-[12px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">{tag}</span>
                      ))}
                    </div>
                    {q.fields_requested?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[11px] text-gray-400 mr-1">Champs :</span>
                        {q.fields_requested.map(f => (
                          <span key={f} className="text-[11px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{FIELD_LABELS[f] ?? f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleCSV(q)}
                      className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <Link href={`/databases/${q.id}`}
                      className="flex items-center gap-1.5 text-[12.5px] font-semibold text-indigo-600 border border-indigo-200 rounded-xl px-3 py-2 hover:bg-indigo-50 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </Link>
                    <button onClick={() => handleDelete(q.id)} disabled={deleting === q.id}
                      className="text-red-400 hover:text-red-600 border border-red-100 rounded-xl p-2 hover:bg-red-50 transition-colors">
                      {deleting === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  )
}
