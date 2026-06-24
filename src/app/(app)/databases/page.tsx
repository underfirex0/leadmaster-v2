'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Clock, ArrowRight, Database, MapPin, Filter, Trash2, Loader2 } from 'lucide-react'

type Query = {
  id: string
  filters: {
    activites?: string[]
    sectors?: string[]
    domaines?: string[]
    cities?: string[]
    name?: string
  }
  result_count: number
  credits_spent: number
  query_name: string | null
  created_at: string
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('fr-MA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export default function DatabasesPage() {
  const [queries, setQueries] = useState<Query[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/searches')
      .then(r => r.json())
      .then(d => setQueries(d.queries ?? []))
      .finally(() => setLoading(false))
  }, [])

  function buildResultsUrl(q: Query) {
    const params = new URLSearchParams()
    const f = q.filters
    if (f.activites?.length)  params.set('activites', f.activites.join(','))
    if (f.cities?.length)     params.set('cities',    f.cities.join(','))
    if (f.name)               params.set('name',      f.name)
    return `/results?${params.toString()}`
  }

  function describeFilters(q: Query) {
    const f = q.filters
    const parts: string[] = []
    if (f.activites?.length)  parts.push(`${f.activites.length} activité${f.activites.length > 1 ? 's' : ''}`)
    if (f.cities?.length)     parts.push(f.cities.join(', '))
    if (f.name)               parts.push(`"${f.name}"`)
    return parts.length ? parts.join(' · ') : 'Toutes les entreprises'
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-[24px] font-bold text-ink-1 tracking-tight mb-1">Mes recherches</h1>
            <p className="text-ink-3 text-[14px]">Historique de vos recherches — relancez en un clic</p>
          </div>
          <Link href="/search" className="btn-brand btn-sm flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Nouvelle recherche
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          </div>
        ) : queries.length === 0 ? (
          <div className="card p-14 text-center">
            <Database className="w-10 h-10 text-ink-5 mx-auto mb-4" />
            <h3 className="font-semibold text-ink-2 text-[16px] mb-2">Aucune recherche effectuée</h3>
            <p className="text-ink-4 text-[13.5px] mb-5">Vos recherches apparaîtront ici pour un accès rapide.</p>
            <Link href="/search" className="btn-brand inline-flex">
              <Search className="w-4 h-4" /> Commencer la prospection
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {queries.map(q => (
              <div key={q.id} className="card p-4 hover:shadow-[var(--sh-card-md)] transition-shadow group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Filter className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="text-[13.5px] font-semibold text-ink-1 truncate">
                        {q.query_name ?? describeFilters(q)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-ink-4 flex-wrap mt-0.5">
                      <span className="flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        {q.result_count.toLocaleString('fr-MA')} entreprises
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(q.created_at)}
                      </span>
                      {q.filters.cities?.length && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {q.filters.cities.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={buildResultsUrl(q)}
                    className="btn-brand btn-sm shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Relancer <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
