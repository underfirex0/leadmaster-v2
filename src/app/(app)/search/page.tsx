'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, ChevronDown, CheckSquare, Square, Minus,
  X, MapPin, Zap, RotateCcw, Info, Phone, Mail, Globe, User,
  Building2, FileText, Share2, Loader2, AlertCircle, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NomenclatureSector, NomenclatureActivite } from '@/types'

// ── Field config ─────────────────────────────────────────────
const FIELDS = [
  { id: 'phone',    label: 'Téléphone',         icon: Phone,     cost: 1, desc: 'phone_1 + phone_2' },
  { id: 'email',    label: 'E-mail',             icon: Mail,      cost: 1, desc: 'email professionnel' },
  { id: 'website',  label: 'Site web',           icon: Globe,     cost: 1, desc: 'URL site internet' },
  { id: 'director', label: 'Dirigeant',          icon: User,      cost: 1, desc: 'nom du dirigeant' },
  { id: 'legal',    label: 'ICE + RC + Capital', icon: Building2, cost: 2, desc: 'données légales' },
  { id: 'address',  label: 'Adresse complète',   icon: MapPin,    cost: 1, desc: 'adresse + GPS' },
  { id: 'social',   label: 'Réseaux sociaux',    icon: Share2,    cost: 1, desc: 'Facebook, Instagram, LinkedIn' },
]

const PRESETS = [
  { id: 'light',    label: 'Contact léger',   fields: ['phone'],                       desc: '~1 cr/biz' },
  { id: 'standard', label: 'Profil standard', fields: ['phone', 'email'],              desc: '~2 cr/biz' },
  { id: 'qualified',label: 'Profil qualifié', fields: ['phone', 'email', 'director'],  desc: '~3 cr/biz' },
  { id: 'complete', label: 'Profil complet',  fields: FIELDS.map(f => f.id),          desc: `~${FIELDS.reduce((s,f)=>s+f.cost,0)} cr/biz` },
]

const SIZES = [10, 25, 50, 100, 200, 500]
const FREE_ALWAYS = ['Raison sociale', 'Ville', 'Secteur', 'Activités', 'Année création']

// ── Nomenclature tree ────────────────────────────────────────
type CheckState = 'none' | 'all' | 'partial'

function CheckIcon({ state, sm }: { state: CheckState; sm?: boolean }) {
  const s = sm ? 'w-3.5 h-3.5' : 'w-4 h-4'
  if (state === 'all')     return <CheckSquare className={cn(s, 'text-indigo-600 shrink-0')} />
  if (state === 'partial') return <Minus className={cn(s, 'text-indigo-400 shrink-0')} />
  return <Square className={cn(s, 'text-gray-300 shrink-0')} />
}

function SectorNode({ sector, selected, onToggle, search }: {
  sector: NomenclatureSector
  selected: Set<string>
  onToggle: (v: string, on: boolean) => void
  search: string
}) {
  const [open, setOpen] = useState(false)
  const allSlugs = useMemo(() =>
    sector.domaines.flatMap(d => d.activites.flatMap(a => a.rubs.map(r => r.rub_slug))), [sector])
  const cnt = allSlugs.filter(s => selected.has(s)).length
  const state: CheckState = cnt === allSlugs.length ? 'all' : cnt > 0 ? 'partial' : 'none'

  const filteredDomaines = useMemo(() => {
    if (!search) return sector.domaines
    const q = search.toLowerCase()
    return sector.domaines
      .map(d => ({ ...d, activites: d.activites.filter(a => a.activite.toLowerCase().includes(q) || a.rubs.some(r => r.rub.toLowerCase().includes(q))) }))
      .filter(d => d.activites.length > 0 || d.domaine.toLowerCase().includes(q))
  }, [sector.domaines, search])

  useEffect(() => { if (search && filteredDomaines.length > 0) setOpen(true) }, [search])
  if (search && filteredDomaines.length === 0) return null

  return (
    <div className={cn('border rounded-xl overflow-hidden transition-all', state !== 'none' ? 'border-indigo-200 shadow-sm' : 'border-gray-100')}>
      <div className={cn('flex items-center gap-2.5 px-3.5 py-3 cursor-pointer', state !== 'none' ? 'bg-indigo-50' : 'hover:bg-gray-50')}>
        <div onClick={() => { if (state === 'all') allSlugs.forEach(s => onToggle(s, false)); else allSlugs.forEach(s => onToggle(s, true)) }}>
          <CheckIcon state={state} />
        </div>
        <div onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn('font-semibold text-[13.5px] flex-1 truncate', state !== 'none' ? 'text-indigo-800' : 'text-gray-800')}>{sector.sector}</span>
          <span className="text-[11px] text-gray-400 font-mono shrink-0">{sector.totalRubs}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        </div>
        {cnt > 0 && <span className="shrink-0 bg-indigo-600 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{cnt}</span>}
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-white p-2 space-y-1">
          {filteredDomaines.map(dom => (
            <div key={dom.domaine}>
              {sector.domaines.length > 1 && (
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{dom.domaine}</div>
              )}
              {dom.activites.map(act => {
                const slugs = act.rubs.map(r => r.rub_slug)
                const actCnt = slugs.filter(s => selected.has(s)).length
                const actState: CheckState = actCnt === slugs.length ? 'all' : actCnt > 0 ? 'partial' : 'none'
                return (
                  <div
                    key={act.activite}
                    onClick={() => { if (actState === 'all') slugs.forEach(s => onToggle(s, false)); else slugs.forEach(s => onToggle(s, true)) }}
                    className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-[13px] transition-colors',
                      actState !== 'none' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-600')}
                  >
                    <CheckIcon state={actState} sm />
                    <span className="flex-1 truncate">{act.activite}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{act.rubs.length}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function SearchPage() {
  const router = useRouter()
  const [tree, setTree]             = useState<NomenclatureSector[]>([])
  const [loadingTree, setLoadingTree] = useState(true)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [cities, setCities]         = useState<string[]>([])
  const [allCities, setAllCities]   = useState<string[]>([])
  const [nameSearch, setNameSearch] = useState('')
  const [treeSearch, setTreeSearch] = useState('')
  const [cityOpen, setCityOpen]     = useState(false)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['phone', 'email']))
  const [maxCompanies, setMaxCompanies]     = useState(50)
  const [estimate, setEstimate]     = useState<number | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [launching, setLaunching]   = useState(false)
  const [balance, setBalance]       = useState<number | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'success'|'error' } | null>(null)

  useEffect(() => {
    fetch('/api/nomenclature').then(r => r.json()).then(data => { setTree(data); setLoadingTree(false) }).catch(() => setLoadingTree(false))
    fetch('/api/me/balance').then(r => r.json()).then(d => setBalance(d.balance))
    // Fetch distinct cities
    fetch('/api/search/cities').then(r => r.json()).then(d => setAllCities(d.cities ?? []))
  }, [])

  const toggleRub = useCallback((slug: string, on: boolean) => {
    setSelected(prev => { const n = new Set(prev); on ? n.add(slug) : n.delete(slug); return n })
    setEstimate(null)
  }, [])

  const toggleField = (fid: string) => {
    setSelectedFields(prev => { const n = new Set(prev); n.has(fid) ? n.delete(fid) : n.add(fid); return n })
  }

  function applyPreset(fields: string[]) {
    setSelectedFields(new Set(fields))
  }

  const costPerBiz = useMemo(() => FIELDS.filter(f => selectedFields.has(f.id)).reduce((s, f) => s + f.cost, 0), [selectedFields])
  const maxCost    = useMemo(() => costPerBiz * maxCompanies, [costPerBiz, maxCompanies])
  const canAfford  = balance !== null ? balance >= maxCost : true
  const hasFilter  = selected.size > 0 || cities.length > 0 || nameSearch.trim()

  // Summary labels
  const sectorSummary = useMemo(() => {
    const labels: string[] = []
    for (const s of tree) {
      const slugs = s.domaines.flatMap(d => d.activites.flatMap(a => a.rubs.map(r => r.rub_slug)))
      const cnt = slugs.filter(sl => selected.has(sl)).length
      if (cnt) labels.push(s.sector)
    }
    return labels
  }, [selected, tree])

  async function handleEstimate() {
    setEstimating(true)
    try {
      const r = await fetch('/api/search/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activites: [...selected], cities, name: nameSearch }),
      })
      const d = await r.json()
      setEstimate(d.count ?? 0)
    } finally { setEstimating(false) }
  }

  async function handleLaunch() {
    if (!selectedFields.size) { setToast({ msg: 'Sélectionnez au moins un champ à débloquer', type: 'error' }); return }
    setLaunching(true)
    try {
      const r = await fetch('/api/search/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activites: [...selected], cities, name: nameSearch,
          fields: [...selectedFields], limit: maxCompanies,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setToast({ msg: d.error || 'Erreur', type: 'error' }); return }
      setBalance(d.newBalance)
      router.push('/databases')
    } catch { setToast({ msg: 'Erreur réseau', type: 'error' })
    } finally { setLaunching(false) }
  }

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t) } }, [toast])

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold text-white',
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500')}>
          {toast.msg}
        </div>
      )}
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Nouvelle recherche</h1>
          <p className="text-gray-500 text-[14px] mt-1">Configurez vos critères, choisissez vos champs, estimez le coût.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* LEFT */}
          <div className="space-y-5">

            {/* Presets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Démarrer avec un profil type
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESETS.map(p => {
                  const cost = FIELDS.filter(f => p.fields.includes(f.id)).reduce((s,f) => s+f.cost, 0)
                  const active = p.fields.length === selectedFields.size && p.fields.every(f => selectedFields.has(f))
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.fields)}
                      className={cn('text-left p-3 rounded-xl border-2 transition-all',
                        active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50')}
                    >
                      <div className={cn('font-semibold text-[12.5px] mb-0.5', active ? 'text-indigo-700' : 'text-gray-700')}>{p.label}</div>
                      <div className="text-[11.5px] text-gray-400">~{cost} cr / entreprise</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Filtres de ciblage
              </div>
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="text-[12px] font-medium text-gray-600 mb-1 block">Nom d'entreprise (optionnel)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={nameSearch} onChange={e => { setNameSearch(e.target.value); setEstimate(null) }}
                      placeholder="Recherche libre..." className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
                {/* City */}
                <div>
                  <label className="text-[12px] font-medium text-gray-600 mb-1 block">Ville</label>
                  <div className="relative">
                    <button onClick={() => setCityOpen(!cityOpen)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] text-left flex items-center justify-between focus:outline-none focus:border-indigo-400">
                      <span className={cities.length ? 'text-gray-800' : 'text-gray-400'}>
                        {cities.length ? (cities.length === 1 ? cities[0] : `${cities.length} villes`) : 'Toutes les villes'}
                      </span>
                      <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', cityOpen && 'rotate-180')} />
                    </button>
                    {cityOpen && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto p-1.5">
                          {allCities.map(c => (
                            <label key={c} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-[13px]">
                              <input type="checkbox" checked={cities.includes(c)} onChange={() => {
                                setCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
                                setEstimate(null)
                              }} className="accent-indigo-600" />
                              <span className="text-gray-700">{c}</span>
                            </label>
                          ))}
                        </div>
                        <div className="border-t px-3 py-2 flex justify-between">
                          <button onClick={() => setCities([])} className="text-[12px] text-gray-400 hover:text-gray-600">Effacer</button>
                          <button onClick={() => setCityOpen(false)} className="text-[12px] font-semibold text-indigo-600">OK</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {cities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cities.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5">
                          {c}<button onClick={() => setCities(p => p.filter(x => x !== c))}><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nomenclature Tree */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Secteurs d'activité
                  </div>
                  {selected.size > 0 && (
                    <button onClick={() => { setSelected(new Set()); setEstimate(null) }}
                      className="text-[11.5px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                      <RotateCcw className="w-3 h-3" /> Tout décocher
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={treeSearch} onChange={e => setTreeSearch(e.target.value)}
                    placeholder="Rechercher un secteur, activité..."
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-[13px] focus:outline-none focus:border-indigo-400" />
                  {treeSearch && <button onClick={() => setTreeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
                </div>
              </div>
              <div className="p-3 max-h-[500px] overflow-y-auto space-y-2">
                {loadingTree ? (
                  Array.from({length:6}).map((_,i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)
                ) : tree.map(s => (
                  <SectorNode key={s.sector} sector={s} selected={selected} onToggle={toggleRub} search={treeSearch} />
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between text-[12px] text-gray-400">
                <span>{tree.reduce((s,t) => s+t.totalRubs, 0)} activités</span>
                {selected.size > 0 && <span className="text-indigo-600 font-semibold">{selected.size} sélectionnée{selected.size>1?'s':''}</span>}
              </div>
            </div>

            {/* Fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  🔓 Champs à débloquer
                </div>
                <button onClick={() => setSelectedFields(new Set())} className="text-[11.5px] text-gray-400 hover:text-gray-600">Tout déselectionner</button>
              </div>

              {/* Free fields */}
              <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-700 mb-2">✓ TOUJOURS INCLUS — GRATUIT</div>
                <div className="flex flex-wrap gap-1.5">
                  {FREE_ALWAYS.map(f => (
                    <span key={f} className="text-[11.5px] text-emerald-700 bg-white border border-emerald-200 rounded-full px-2.5 py-0.5">✓ {f}</span>
                  ))}
                </div>
              </div>

              {/* Premium fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FIELDS.map(f => {
                  const Icon = f.icon
                  const on = selectedFields.has(f.id)
                  return (
                    <label key={f.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      on ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    )}>
                      <input type="checkbox" checked={on} onChange={() => toggleField(f.id)} className="sr-only" />
                      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                        on ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300')}>
                        {on && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <Icon className={cn('w-4 h-4 shrink-0', on ? 'text-indigo-600' : 'text-gray-400')} />
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-[13px] font-semibold', on ? 'text-indigo-700' : 'text-gray-700')}>{f.label}</div>
                        <div className="text-[11px] text-gray-400">{f.desc}</div>
                      </div>
                      <span className={cn('text-[12px] font-bold shrink-0', on ? 'text-indigo-600' : 'text-gray-400')}>+{f.cost} cr</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — sticky summary */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">

            {/* Volume */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Nombre d'entreprises</div>
              <div className="text-[44px] font-bold text-gray-900 font-mono tabular-nums leading-none mb-1">{maxCompanies}</div>
              <div className="text-[12px] text-gray-400 mb-4">résultats max</div>
              <input type="range" min={5} max={500} value={maxCompanies}
                onChange={e => { setMaxCompanies(Number(e.target.value)); setEstimate(null) }}
                className="w-full accent-indigo-600 mb-3" />
              <div className="flex gap-1.5 flex-wrap">
                {SIZES.map(s => (
                  <button key={s} onClick={() => { setMaxCompanies(s); setEstimate(null) }}
                    className={cn('text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                      maxCompanies === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-300')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Récapitulatif</div>
              {FIELDS.filter(f => selectedFields.has(f.id)).map(f => (
                <div key={f.id} className="flex justify-between text-[13px] mb-1.5">
                  <span className="text-gray-600">{f.label}</span>
                  <span className="font-semibold text-gray-800">+{f.cost} cr/biz</span>
                </div>
              ))}
              {selectedFields.size === 0 && <div className="text-[13px] text-gray-400 mb-3">Aucun champ sélectionné</div>}
              <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Coût par entreprise</span>
                  <span className="font-bold text-gray-800">{costPerBiz} cr</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Max entreprises</span>
                  <span className="font-bold text-gray-800">×{maxCompanies}</span>
                </div>
                <div className="flex justify-between text-[15px] font-bold mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-700">Estimation max</span>
                  <span className="text-indigo-600">{maxCost.toLocaleString('fr-MA')} cr</span>
                </div>
                {balance !== null && (
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-gray-400">Votre solde</span>
                    <span className={cn('font-semibold', canAfford ? 'text-emerald-600' : 'text-red-500')}>{balance.toLocaleString('fr-MA')} cr</span>
                  </div>
                )}
              </div>
              {estimate !== null && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                  <div className="text-[22px] font-bold text-indigo-700">{estimate.toLocaleString('fr-MA')}</div>
                  <div className="text-[12px] text-indigo-500">entreprises correspondent</div>
                </div>
              )}
              {!canAfford && maxCost > 0 && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-[12px] text-red-600">Solde insuffisant. Rechargez vos crédits.</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              {!estimate && hasFilter && (
                <button onClick={handleEstimate} disabled={estimating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold text-[13.5px] hover:bg-indigo-50 transition-all">
                  {estimating ? <Loader2 className="w-4 h-4 animate-spin" /> : '📊'}
                  {estimating ? 'Estimation...' : 'Estimer le nombre de résultats'}
                </button>
              )}
              <button
                onClick={handleLaunch}
                disabled={launching || !selectedFields.size || !canAfford}
                className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] transition-all shadow-lg',
                  !selectedFields.size || !canAfford
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200')}
              >
                {launching ? <><Loader2 className="w-4 h-4 animate-spin" />Lancement...</> : <>Lancer la recherche →</>}
              </button>
              {!hasFilter && !launching && (
                <p className="text-center text-[12px] text-gray-400">Ajoutez au moins un filtre (secteur, ville...) pour lancer.</p>
              )}
            </div>

            {/* Info */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-[12px] text-gray-500">
              <div className="font-semibold text-gray-600 mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Comment ça marche</div>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-1.5"><span className="text-emerald-500 shrink-0">✓</span> Champs libres (nom, secteur, ville) toujours gratuits</li>
                <li className="flex items-start gap-1.5"><span className="text-indigo-500 shrink-0">✓</span> Coût déduit uniquement pour les champs débloqués</li>
                <li className="flex items-start gap-1.5"><span className="text-indigo-500 shrink-0">✓</span> Jamais facturé deux fois pour le même champ</li>
                <li className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0">✓</span> Estimation = maximum — le coût réel peut être inférieur</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
