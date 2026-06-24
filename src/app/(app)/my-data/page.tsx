'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Phone, Mail, Globe, User, Building2, MapPin, Unlock, Users2,
  Download, Search, X, ChevronRight, Star, CheckSquare, Square,
  Loader2, Filter, ExternalLink, Instagram, Linkedin, Facebook,
  ArrowRight, Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Company } from '@/types'
import { CITIES } from '@/lib/constants'

type UnlockedCompany = Company & { is_unlocked: true; unlocked_at: string }

// ── Company Detail Card ──────────────────────────────────────
function CompanyDetailCard({
  company,
  selected,
  onSelect,
}: {
  company: UnlockedCompany
  selected: boolean
  onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  function initials(name: string) {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  return (
    <div className={cn(
      'card overflow-hidden transition-all duration-200',
      selected && 'ring-2 ring-brand-500 border-transparent'
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button onClick={() => onSelect(company.id)} className={cn('mt-0.5 shrink-0', selected ? 'text-brand-600' : 'text-ink-5 hover:text-ink-3')}>
            {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>

          {/* Logo */}
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[12px] font-bold text-emerald-700 shrink-0 border border-emerald-200 overflow-hidden">
            {company.logo_url
              ? <img src={company.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : initials(company.name)
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-[14px] text-ink-1 truncate">{company.name}</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[12px] text-ink-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-ink-4" />{company.city ?? '—'}
                  </span>
                  {company.forme_juridique && (
                    <span className="text-[11px] text-ink-4 border-l pl-2 border-[rgba(0,0,0,0.08)]">{company.forme_juridique}</span>
                  )}
                  {company.annee_creation && (
                    <span className="text-[11px] text-ink-4 border-l pl-2 border-[rgba(0,0,0,0.08)]">Créé {company.annee_creation}</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 rounded-pill px-2 py-0.5 border border-emerald-200">
                <Unlock className="w-3 h-3" /> Déverrouillé
              </span>
            </div>

            {/* Activities */}
            {Array.isArray(company.activities) && company.activities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-2">
                {company.activities.slice(0, 4).map((act: string, i: number) => (
                  <span key={i} className="text-[11px] bg-surface-2 border border-[rgba(0,0,0,0.07)] text-ink-3 rounded-pill px-2 py-0.5">{act}</span>
                ))}
              </div>
            )}

            {/* Core contact data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
              {company.phone_1 && (
                <a href={`tel:${company.phone_1}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand-700 group">
                  <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="font-mono truncate">{company.phone_1}</span>
                </a>
              )}
              {company.phone_2 && (
                <a href={`tel:${company.phone_2}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand-700">
                  <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="font-mono truncate">{company.phone_2}</span>
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand-700 col-span-full sm:col-span-1">
                  <Mail className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{company.email}</span>
                </a>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12.5px] text-brand-600 hover:underline">
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
                </a>
              )}
              {company.director && (
                <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                  <User className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate font-medium">{company.director}</span>
                </div>
              )}
            </div>

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-[12px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors"
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
              <ChevronRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[rgba(0,0,0,0.06)] p-4 bg-surface-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[12.5px]">
            {company.ice && (
              <div>
                <span className="text-ink-4 block text-[11px] mb-0.5 font-medium uppercase tracking-wide">ICE</span>
                <span className="font-mono text-ink-2">{company.ice}</span>
              </div>
            )}
            {company.rc && (
              <div>
                <span className="text-ink-4 block text-[11px] mb-0.5 font-medium uppercase tracking-wide">RC</span>
                <span className="text-ink-2">{company.rc}</span>
              </div>
            )}
            {company.capital && (
              <div>
                <span className="text-ink-4 block text-[11px] mb-0.5 font-medium uppercase tracking-wide">Capital</span>
                <span className="text-ink-2">{company.capital}</span>
              </div>
            )}
            {company.address_raw && (
              <div className="col-span-full">
                <span className="text-ink-4 block text-[11px] mb-0.5 font-medium uppercase tracking-wide">Adresse</span>
                <span className="text-ink-2">{company.address_raw}</span>
              </div>
            )}
            {company.description && (
              <div className="col-span-full">
                <span className="text-ink-4 block text-[11px] mb-0.5 font-medium uppercase tracking-wide">Description</span>
                <p className="text-ink-2 line-clamp-3">{company.description}</p>
              </div>
            )}
          </div>

          {/* Social links */}
          {(company.facebook || company.instagram || company.linkedin || company.youtube) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
              <span className="text-[11px] text-ink-4 uppercase tracking-wide font-medium">Réseaux</span>
              {company.facebook  && <a href={company.facebook}  target="_blank" rel="noopener noreferrer" className="text-ink-4 hover:text-[#1877f2]"><Facebook  className="w-4 h-4" /></a>}
              {company.instagram && <a href={company.instagram} target="_blank" rel="noopener noreferrer" className="text-ink-4 hover:text-[#e1306c]"><Instagram className="w-4 h-4" /></a>}
              {company.linkedin  && <a href={company.linkedin}  target="_blank" rel="noopener noreferrer" className="text-ink-4 hover:text-[#0077b5]"><Linkedin  className="w-4 h-4" /></a>}
            </div>
          )}

          {/* Google Maps */}
          {company.latitude && company.longitude && (
            <a
              href={`https://maps.google.com/?q=${company.latitude},${company.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-brand-600 hover:underline"
            >
              <MapPin className="w-3 h-3" /> Voir sur Google Maps
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main My Data Page ────────────────────────────────────────
export default function MyDataPage() {
  const [companies, setCompanies]   = useState<UnlockedCompany[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage]             = useState(1)
  const [hasMore, setHasMore]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [injecting, setInjecting]   = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [toast, setToast]           = useState<{ msg: string; type: 'success'|'error' } | null>(null)
  const [cityFilter, setCityFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')

  function showToast(msg: string, type: 'success'|'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchData = useCallback(async (p: number, reset = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(p), limit: '30',
        ...(cityFilter && { city: cityFilter }),
        ...(nameFilter && { search: nameFilter }),
      })
      const r = await fetch(`/api/my-data?${params}`)
      const data = await r.json()
      if (reset || p === 1) setCompanies(data.companies ?? [])
      else setCompanies(prev => [...prev, ...(data.companies ?? [])])
      setTotalCount(data.totalCount ?? 0)
      setHasMore(data.hasMore ?? false)
    } finally {
      setLoading(false)
    }
  }, [cityFilter, nameFilter])

  useEffect(() => { fetchData(1, true) }, [cityFilter, nameFilter])

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function selectAll() {
    if (selected.size === companies.length) setSelected(new Set())
    else setSelected(new Set(companies.map(c => c.id)))
  }

  async function handleInject() {
    const ids = selected.size > 0 ? [...selected] : companies.map(c => c.id)
    if (!ids.length) return
    setInjecting(true)
    try {
      const r = await fetch('/api/my-data/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_ids: ids }),
      })
      const data = await r.json()
      if (!r.ok) { showToast(data.error || 'Erreur injection', 'error'); return }
      showToast(data.message, 'success')
      setSelected(new Set())
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setInjecting(false)
    }
  }

  function exportCSV() {
    setExporting(true)
    const toExport = selected.size > 0
      ? companies.filter(c => selected.has(c.id))
      : companies

    const headers = ['Nom','Ville','Téléphone','Email','Site web','Dirigeant','ICE','Forme juridique','Année création','Adresse']
    const rows = toExport.map(c => [
      c.name, c.city ?? '', c.phone_1 ?? '', c.email ?? '', c.website ?? '',
      c.director ?? '', c.ice ?? '', c.forme_juridique ?? '', c.annee_creation ?? '',
      c.address_raw ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `leadmaster-data-${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
    setExporting(false)
    showToast(`${toExport.length} entreprises exportées`, 'success')
  }

  return (
    <div className="min-h-screen bg-surface-1">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-floating text-[13px] font-medium animate-scale-in max-w-sm',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
          <div>
            <h1 className="text-[28px] font-bold text-ink-1 tracking-tight mb-1.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Unlock className="w-4 h-4 text-emerald-600" />
              </div>
              Mes Données
            </h1>
            <p className="text-ink-3 text-[14px]">
              {loading ? '…' : `${totalCount.toLocaleString('fr-MA')} entreprise${totalCount !== 1 ? 's' : ''} déverrouillée${totalCount !== 1 ? 's' : ''}`}
              {' '} — Coordonnées complètes, injectables dans votre CRM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/search" className="btn-ghost btn-sm flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Nouvelle recherche
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {!loading && totalCount === 0 && !cityFilter && !nameFilter ? (
          <div className="card p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
              <Database className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="font-bold text-ink-1 text-[17px] mb-2">Aucune donnée déverrouillée</h3>
            <p className="text-ink-3 text-[14px] mb-6 max-w-md mx-auto">
              Recherchez des entreprises par secteur et déverrouillez leurs coordonnées pour les retrouver ici (1 crédit / entreprise).
            </p>
            <Link href="/search" className="btn-brand inline-flex items-center gap-2">
              Commencer la prospection <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Filters + Toolbar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Name search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
                <input
                  value={nameFilter}
                  onChange={e => setNameFilter(e.target.value)}
                  placeholder="Rechercher dans mes données..."
                  className="input pl-9 py-2 text-[13px] w-full"
                />
                {nameFilter && (
                  <button onClick={() => setNameFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-ink-4" />
                  </button>
                )}
              </div>

              {/* City filter */}
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="input py-2 text-[13px] w-auto min-w-[160px]"
              >
                <option value="">Toutes les villes</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Bulk actions */}
              {companies.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={selectAll} className="btn-ghost btn-sm flex items-center gap-1.5 text-[12.5px]">
                    {selected.size === companies.length ? <CheckSquare className="w-3.5 h-3.5 text-brand-600" /> : <Square className="w-3.5 h-3.5 text-ink-4" />}
                    {selected.size > 0 ? `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''}` : 'Tout sélectionner'}
                  </button>
                  <button
                    onClick={exportCSV}
                    disabled={exporting}
                    className="btn-ghost btn-sm flex items-center gap-1.5 text-[12.5px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exporting ? 'Export...' : 'Exporter CSV'}
                  </button>
                  <button
                    onClick={handleInject}
                    disabled={injecting}
                    className="btn-brand btn-sm flex items-center gap-1.5 text-[12.5px]"
                  >
                    {injecting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Injection...</>
                      : <><Users2 className="w-3.5 h-3.5" /> {selected.size > 0 ? `Injecter ${selected.size}` : 'Tout injecter'} → CRM</>
                    }
                  </button>
                </div>
              )}
            </div>

            {/* Companies list */}
            {loading && companies.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-28 skeleton" />)}
              </div>
            ) : companies.length === 0 ? (
              <div className="card p-10 text-center">
                <Search className="w-8 h-8 text-ink-5 mx-auto mb-3" />
                <p className="text-ink-3">Aucune entreprise ne correspond à vos filtres.</p>
                <button onClick={() => { setNameFilter(''); setCityFilter('') }} className="btn-ghost btn-sm mt-3 inline-flex">
                  Effacer les filtres
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map(c => (
                  <CompanyDetailCard
                    key={c.id}
                    company={c}
                    selected={selected.has(c.id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={() => { const next = page + 1; setPage(next); fetchData(next) }}
                  disabled={loading}
                  className="btn-ghost px-8"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</> : 'Charger plus'}
                </button>
                <p className="text-[12px] text-ink-4 mt-2">{companies.length} / {totalCount.toLocaleString('fr-MA')} affichées</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
