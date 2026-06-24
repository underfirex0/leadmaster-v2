'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, ChevronDown, CheckSquare, Square, Minus,
  X, MapPin, Building2, Sparkles, Filter, RotateCcw, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CITIES, SECTOR_ICONS, DEFAULT_SECTOR_ICON } from '@/lib/constants'
import type { NomenclatureSector, NomenclatureActivite } from '@/types'

// ── Checkbox states ───────────────────────────────────────────
type CheckState = 'none' | 'all' | 'partial'

// ── Tree Node Component ───────────────────────────────────────
function ActiviteNode({
  activite,
  selectedRubs,
  onToggle,
}: {
  activite: NomenclatureActivite
  selectedRubs: Set<string>
  onToggle: (slug: string, checked: boolean) => void
}) {
  const allSelected = activite.rubs.every(r => selectedRubs.has(r.rub_slug))
  const anySelected = activite.rubs.some(r => selectedRubs.has(r.rub_slug))
  const state: CheckState = allSelected ? 'all' : anySelected ? 'partial' : 'none'
  const [open, setOpen] = useState(false)
  const single = activite.rubs.length === 1

  function toggle() {
    if (state === 'all') activite.rubs.forEach(r => onToggle(r.rub_slug, false))
    else activite.rubs.forEach(r => onToggle(r.rub_slug, true))
  }

  if (single) {
    const rub = activite.rubs[0]
    const checked = selectedRubs.has(rub.rub_slug)
    return (
      <div
        onClick={() => onToggle(rub.rub_slug, !checked)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-[13px]',
          checked ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-2 text-ink-2'
        )}
      >
        <CheckboxIcon state={checked ? 'all' : 'none'} />
        <span className="flex-1 truncate">{rub.rub}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1">
        <div
          onClick={toggle}
          className={cn(
            'flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-[13px]',
            state !== 'none' ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-2 text-ink-2'
          )}
        >
          <CheckboxIcon state={state} />
          <span className="flex-1 truncate font-medium">{activite.activite}</span>
          <span className="text-[11px] text-ink-4 shrink-0">{activite.rubs.length}</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1 rounded hover:bg-surface-2 text-ink-4 transition-colors shrink-0"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {activite.rubs.map(rub => {
            const checked = selectedRubs.has(rub.rub_slug)
            return (
              <div
                key={rub.rub_slug}
                onClick={() => onToggle(rub.rub_slug, !checked)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-lg cursor-pointer transition-colors text-[12px]',
                  checked ? 'bg-brand-50/70 text-brand-700' : 'hover:bg-surface-2 text-ink-3'
                )}
              >
                <CheckboxIcon state={checked ? 'all' : 'none'} small />
                <span className="truncate">{rub.rub}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CheckboxIcon({ state, small }: { state: CheckState; small?: boolean }) {
  const size = small ? 'w-3.5 h-3.5' : 'w-4 h-4'
  if (state === 'all')     return <CheckSquare className={cn(size, 'text-brand-600 shrink-0')} />
  if (state === 'partial') return <Minus      className={cn(size, 'text-brand-400 shrink-0')} />
  return <Square className={cn(size, 'text-ink-4 shrink-0')} />
}

// ── Sector Accordion ─────────────────────────────────────────
function SectorNode({
  sector,
  selectedRubs,
  onToggleRub,
  searchQuery,
}: {
  sector: NomenclatureSector
  selectedRubs: Set<string>
  onToggleRub: (slug: string, checked: boolean) => void
  searchQuery: string
}) {
  const [open, setOpen] = useState(false)
  const icon = SECTOR_ICONS[sector.sector] ?? DEFAULT_SECTOR_ICON

  const allRubSlugs = useMemo(() =>
    sector.domaines.flatMap(d => d.activites.flatMap(a => a.rubs.map(r => r.rub_slug))),
    [sector]
  )
  const selectedCount = allRubSlugs.filter(s => selectedRubs.has(s)).length
  const state: CheckState = selectedCount === allRubSlugs.length ? 'all'
    : selectedCount > 0 ? 'partial' : 'none'

  // Auto-open if has search query match
  useEffect(() => {
    if (searchQuery && sector.sector.toLowerCase().includes(searchQuery.toLowerCase())) setOpen(true)
  }, [searchQuery, sector.sector])

  function toggleAll() {
    if (state === 'all') allRubSlugs.forEach(s => onToggleRub(s, false))
    else allRubSlugs.forEach(s => onToggleRub(s, true))
  }

  // Filter domaines by search
  const filteredDomaines = useMemo(() => {
    if (!searchQuery) return sector.domaines
    const q = searchQuery.toLowerCase()
    return sector.domaines.map(d => ({
      ...d,
      activites: d.activites.filter(a =>
        a.activite.toLowerCase().includes(q) ||
        a.rubs.some(r => r.rub.toLowerCase().includes(q))
      )
    })).filter(d => d.activites.length > 0 || d.domaine.toLowerCase().includes(q))
  }, [sector.domaines, searchQuery])

  if (searchQuery && filteredDomaines.length === 0) return null

  return (
    <div className={cn(
      'border border-[rgba(0,0,0,0.07)] rounded-xl overflow-hidden transition-all',
      state !== 'none' ? 'border-brand-200 shadow-[0_0_0_2px_rgba(79,70,229,0.08)]' : ''
    )}>
      {/* Sector header */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-3.5 py-3 cursor-pointer transition-colors',
          state !== 'none' ? 'bg-brand-50' : 'hover:bg-surface-1'
        )}
      >
        <div onClick={toggleAll} className="flex items-center gap-2.5 shrink-0">
          <CheckboxIcon state={state} />
        </div>
        <div onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base shrink-0">{icon}</span>
          <span className={cn(
            'font-semibold text-[13.5px] flex-1 truncate',
            state !== 'none' ? 'text-brand-800' : 'text-ink-1'
          )}>
            {sector.sector}
          </span>
          <span className="text-[11px] text-ink-4 shrink-0 font-mono">{sector.totalRubs}</span>
          <span className="shrink-0 text-ink-4">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </div>
        {selectedCount > 0 && (
          <span className="shrink-0 bg-brand-600 text-white text-[11px] font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
            {selectedCount}
          </span>
        )}
      </div>

      {/* Domaine/Activite children */}
      {open && (
        <div className="border-t border-[rgba(0,0,0,0.06)] bg-white p-2 space-y-1">
          {filteredDomaines.map(domaine => (
            <div key={domaine.domaine}>
              {sector.domaines.length > 1 && (
                <div className="px-3 py-1 text-[11px] font-bold text-ink-4 uppercase tracking-wider mt-1 first:mt-0">
                  {domaine.domaine}
                </div>
              )}
              <div className="space-y-0.5">
                {domaine.activites.map(activite => (
                  <ActiviteNode
                    key={activite.activite}
                    activite={activite}
                    selectedRubs={selectedRubs}
                    onToggle={onToggleRub}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Search Page ─────────────────────────────────────────
export default function SearchPage() {
  const router = useRouter()
  const [tree, setTree]           = useState<NomenclatureSector[]>([])
  const [loadingTree, setLoadingTree] = useState(true)
  const [selectedRubs, setSelectedRubs] = useState<Set<string>>(new Set())
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [nameSearch, setNameSearch] = useState('')
  const [treeSearch, setTreeSearch] = useState('')
  const [cityOpen, setCityOpen]   = useState(false)
  const [estimate, setEstimate]   = useState<{ count: number; cost: number } | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [searching, setSearching] = useState(false)

  // Load nomenclature tree
  useEffect(() => {
    fetch('/api/nomenclature')
      .then(r => r.json())
      .then(data => { setTree(data); setLoadingTree(false) })
      .catch(() => setLoadingTree(false))
  }, [])

  const toggleRub = useCallback((slug: string, checked: boolean) => {
    setSelectedRubs(prev => {
      const next = new Set(prev)
      if (checked) next.add(slug)
      else next.delete(slug)
      return next
    })
    setEstimate(null)
  }, [])

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
    setEstimate(null)
  }

  const clearAll = () => {
    setSelectedRubs(new Set())
    setSelectedCities([])
    setNameSearch('')
    setEstimate(null)
  }

  const hasFilters = selectedRubs.size > 0 || selectedCities.length > 0 || nameSearch.trim()

  // Build summary labels
  const selectionSummary = useMemo(() => {
    const labels: string[] = []
    // Group selected rubs by sector
    const sectorCounts: Record<string, number> = {}
    for (const sector of tree) {
      const allSlugs = sector.domaines.flatMap(d => d.activites.flatMap(a => a.rubs.map(r => r.rub_slug)))
      const cnt = allSlugs.filter(s => selectedRubs.has(s)).length
      if (cnt > 0) sectorCounts[sector.sector] = cnt
    }
    for (const [sector, cnt] of Object.entries(sectorCounts)) {
      const icon = SECTOR_ICONS[sector] ?? DEFAULT_SECTOR_ICON
      const total = tree.find(s => s.sector === sector)?.totalRubs ?? 0
      labels.push(`${icon} ${sector}${cnt < total ? ` (${cnt})` : ''}`)
    }
    return labels
  }, [selectedRubs, tree])

  async function handleEstimate() {
    setEstimating(true)
    try {
      const r = await fetch('/api/search/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activites: [...selectedRubs],
          cities: selectedCities,
          name: nameSearch.trim(),
        }),
      })
      const data = await r.json()
      setEstimate({ count: data.count, cost: data.count })
    } catch {
      setEstimate({ count: 0, cost: 0 })
    } finally {
      setEstimating(false)
    }
  }

  function handleSearch() {
    setSearching(true)
    const params = new URLSearchParams()
    if (selectedRubs.size) params.set('activites', [...selectedRubs].join(','))
    if (selectedCities.length) params.set('cities', selectedCities.join(','))
    if (nameSearch.trim()) params.set('name', nameSearch.trim())
    router.push(`/results?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="max-w-[1280px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[13px] text-ink-4 mb-3">
            <Building2 className="w-3.5 h-3.5" />
            <span>LeadMaster</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-ink-2">Recherche de données</span>
          </div>
          <h1 className="text-[28px] font-bold text-ink-1 tracking-tight mb-1.5">Recherche d'entreprises</h1>
          <p className="text-ink-3 text-[15px]">
            Explorez +53 000 entreprises marocaines par secteur d'activité. La navigation est <strong>gratuite</strong> — payez 1 crédit par entreprise pour débloquer les coordonnées.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* LEFT — Nomenclature Tree */}
          <div className="card p-0 overflow-hidden">
            {/* Tree header */}
            <div className="px-4 pt-4 pb-3 border-b border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[14px] text-ink-1 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-600" />
                  Secteurs d'activité
                </h2>
                {selectedRubs.size > 0 && (
                  <button
                    onClick={() => { setSelectedRubs(new Set()); setEstimate(null) }}
                    className="text-[12px] text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" /> Tout décocher
                  </button>
                )}
              </div>
              {/* Tree search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
                <input
                  value={treeSearch}
                  onChange={e => setTreeSearch(e.target.value)}
                  placeholder="Rechercher un secteur, activité..."
                  className="input pl-9 pr-8 py-2 text-[13px] w-full"
                />
                {treeSearch && (
                  <button onClick={() => setTreeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-ink-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Tree body */}
            <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {loadingTree ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 skeleton rounded-xl" />
                  ))}
                </div>
              ) : tree.length === 0 ? (
                <div className="text-center py-8 text-ink-4">Nomenclature non disponible</div>
              ) : (
                tree.map(sector => (
                  <SectorNode
                    key={sector.sector}
                    sector={sector}
                    selectedRubs={selectedRubs}
                    onToggleRub={toggleRub}
                    searchQuery={treeSearch}
                  />
                ))
              )}
            </div>

            {/* Tree footer */}
            <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)] bg-surface-1 flex items-center justify-between text-[12px] text-ink-4">
              <span>{tree.reduce((s, t) => s + t.totalRubs, 0)} activités disponibles</span>
              {selectedRubs.size > 0 && (
                <span className="text-brand-600 font-semibold">{selectedRubs.size} sélectionnée{selectedRubs.size > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* RIGHT — Filters + Actions */}
          <div className="space-y-4">

            {/* City filter */}
            <div className="card p-4">
              <h3 className="font-semibold text-[13px] text-ink-1 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" /> Ville
              </h3>
              <div className="relative mb-2">
                <button
                  onClick={() => setCityOpen(!cityOpen)}
                  className="w-full input py-2 text-left flex items-center justify-between text-[13px]"
                >
                  <span className={selectedCities.length ? 'text-ink-1' : 'text-ink-4'}>
                    {selectedCities.length
                      ? selectedCities.length === 1 ? selectedCities[0] : `${selectedCities.length} villes`
                      : 'Toutes les villes'}
                  </span>
                  <ChevronDown className={cn('w-4 h-4 text-ink-4 transition-transform', cityOpen && 'rotate-180')} />
                </button>
                {cityOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[rgba(0,0,0,0.09)] rounded-xl shadow-floating overflow-hidden">
                    <div className="max-h-52 overflow-y-auto p-1">
                      {CITIES.map(city => (
                        <label key={city} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-1 text-[13px]">
                          <input
                            type="checkbox"
                            checked={selectedCities.includes(city)}
                            onChange={() => toggleCity(city)}
                            className="accent-brand-600 w-3.5 h-3.5"
                          />
                          <span className="text-ink-2">{city}</span>
                        </label>
                      ))}
                    </div>
                    <div className="border-t border-[rgba(0,0,0,0.06)] px-3 py-2 flex justify-between items-center">
                      <button onClick={() => setSelectedCities([])} className="text-[12px] text-ink-4 hover:text-ink-2">Effacer</button>
                      <button onClick={() => setCityOpen(false)} className="text-[12px] font-semibold text-brand-600">Appliquer</button>
                    </div>
                  </div>
                )}
              </div>
              {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedCities.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-700 rounded-pill px-2 py-0.5 border border-brand-100">
                      {c}
                      <button onClick={() => toggleCity(c)}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Name search */}
            <div className="card p-4">
              <h3 className="font-semibold text-[13px] text-ink-1 mb-3 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand-600" /> Recherche par nom
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
                <input
                  value={nameSearch}
                  onChange={e => { setNameSearch(e.target.value); setEstimate(null) }}
                  placeholder="Nom d'entreprise..."
                  className="input pl-9 py-2 text-[13px] w-full"
                />
              </div>
            </div>

            {/* Selection summary */}
            {(selectionSummary.length > 0 || selectedCities.length > 0 || nameSearch) && (
              <div className="card p-4 border-brand-100">
                <h3 className="font-semibold text-[13px] text-ink-1 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Sélection actuelle
                </h3>
                <div className="space-y-1.5">
                  {selectionSummary.map((label, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                      {label}
                    </div>
                  ))}
                  {selectedCities.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                      <MapPin className="w-3 h-3 text-ink-4" /> {selectedCities.join(', ')}
                    </div>
                  )}
                  {nameSearch && (
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                      <Search className="w-3 h-3 text-ink-4" /> "{nameSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estimate result */}
            {estimate && (
              <div className="card p-4 bg-brand-50 border-brand-200">
                <div className="text-center">
                  <div className="text-[28px] font-bold text-brand-700 font-mono tabular-nums">
                    {estimate.count.toLocaleString('fr-MA')}
                  </div>
                  <div className="text-[13px] text-brand-600 mb-2">entreprises trouvées</div>
                  <div className="flex items-center justify-center gap-1 text-[12px] text-ink-3">
                    <Info className="w-3 h-3" />
                    <span>1 crédit / entreprise déverrouillée</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2.5">
              {!estimate && hasFilters && (
                <button
                  onClick={handleEstimate}
                  disabled={estimating}
                  className="btn-ghost w-full justify-center text-[13.5px] font-semibold"
                >
                  {estimating ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />Estimation...</span>
                  ) : '📊 Estimer le nombre de résultats'}
                </button>
              )}
              <button
                onClick={handleSearch}
                disabled={searching}
                className="btn-brand w-full justify-center text-[14px] font-semibold"
              >
                {searching ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-brand-300 border-t-white rounded-full animate-spin" />Chargement...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    {hasFilters ? 'Voir les entreprises' : 'Parcourir toutes les entreprises'}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </button>
              {hasFilters && (
                <button onClick={clearAll} className="w-full text-center text-[12px] text-ink-4 hover:text-ink-2 transition-colors py-1">
                  Effacer tous les filtres
                </button>
              )}
            </div>

            {/* Credit info box */}
            <div className="rounded-xl bg-surface-2 border border-[rgba(0,0,0,0.06)] p-4 text-[12px] text-ink-3">
              <div className="font-semibold text-ink-2 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-500" /> Comment ça marche
              </div>
              <ul className="space-y-1.5 list-none">
                <li className="flex items-start gap-1.5"><span className="text-green-500 shrink-0 mt-0.5">✓</span> Navigation gratuite — voyez le nom, la ville, les activités</li>
                <li className="flex items-start gap-1.5"><span className="text-brand-500 shrink-0 mt-0.5">🔓</span> 1 crédit = accès complet (téléphone, email, dirigeant, ICE…)</li>
                <li className="flex items-start gap-1.5"><span className="text-purple-500 shrink-0 mt-0.5">📁</span> Données débloquées dans "Mes Données" à vie</li>
                <li className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0 mt-0.5">🔁</span> Injectez dans votre CRM en 1 clic</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
