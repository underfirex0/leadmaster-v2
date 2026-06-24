'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Phone, Mail, Globe, User, Building2, MapPin, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Company = {
  id: string
  name: string
  city: string | null
  phone_1: string | null
  email: string | null
  website: string | null
  director: string | null
  forme_juridique: string | null
  annee_creation: string | null
  ice: string | null
  activities: string[] | null
}

export default function AdminDataPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [city, setCity]           = useState('')
  const [loading, setLoading]     = useState(true)
  const PAGE_SIZE = 25

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(PAGE_SIZE),
        ...(search && { name: search }),
        ...(city && { city }),
      })
      const r = await window.fetch(`/api/admin/companies?${params}`)
      const data = await r.json()
      setCompanies(data.companies ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, city])

  useEffect(() => { fetch() }, [fetch])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-ink-1">Base de données</h1>
          <p className="text-ink-4 text-[13.5px] mt-0.5">{total.toLocaleString('fr-MA')} entreprises marocaines (Telecontact)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom..."
            className="input pl-9 py-2 text-[13px] w-full"
          />
        </div>
        <input
          value={city}
          onChange={e => { setCity(e.target.value); setPage(1) }}
          placeholder="Ville..."
          className="input py-2 text-[13px] w-40"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Ville</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Dirigeant</th>
                <th>ICE</th>
                <th>Activités</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 skeleton rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : companies.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="font-semibold text-[13px] text-ink-1">{c.name}</div>
                    {c.forme_juridique && <div className="text-[11px] text-ink-4">{c.forme_juridique}</div>}
                  </td>
                  <td className="text-[13px] text-ink-3">
                    {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-ink-5" />{c.city}</span>}
                  </td>
                  <td className="font-mono text-[12px] text-ink-2">{c.phone_1 ?? '—'}</td>
                  <td className="text-[12px] text-ink-2 max-w-[160px] truncate">{c.email ?? '—'}</td>
                  <td className="text-[12px] text-ink-2">{c.director ?? '—'}</td>
                  <td className="font-mono text-[11px] text-ink-4">{c.ice ?? '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(c.activities ?? []).slice(0, 2).map((a: string, i: number) => (
                        <span key={i} className="text-[10px] bg-surface-2 border border-[rgba(0,0,0,0.07)] text-ink-4 rounded-pill px-1.5 py-0.5">{a}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(0,0,0,0.06)]">
          <span className="text-[12.5px] text-ink-4">
            Page {page} / {totalPages} — {total.toLocaleString('fr-MA')} entrées
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost btn-sm !py-1 !px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-ghost btn-sm !py-1 !px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
