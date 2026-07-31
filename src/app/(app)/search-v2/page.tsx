'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Building2, Users2, Wallet, CheckCircle2, ChevronRight, ChevronLeft,
  Search, Loader2, Phone, Mail, Globe, ShieldCheck, UserRound, Calendar,
  Banknote, Sparkles, X, ArrowRight, Tag, Globe2, ListChecks
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

interface TaxActivite { id: number; activite: string; count: number }
interface TaxDomaine { domaine: string; totalCount: number; activites: TaxActivite[] }
interface TaxSector { sector: string; totalCount: number; domaines: TaxDomaine[] }
interface CityRow { city: string; count: number }

const EFFECTIF_TRANCHES = [
  'De 1 à 9 salariés', 'De 10 à 19 salariés', 'De 20 à 49 salariés',
  'De 50 à 99 salariés', 'De 100 à 249 salariés', 'De 250 à 499 salariés',
  'De 500 à 999 salariés', 'De 1 000 à 4 999 salariés', 'Plus de 5 000 salariés',
]
const CAPITAL_TRANCHES = [
  { value: '0-100000',          label: 'Moins de 100 000 MAD',  min: 0,        max: 100000 as number|null },
  { value: '100000-500000',     label: '100 000 — 500 000 MAD', min: 100000,   max: 500000 },
  { value: '500000-1000000',    label: '500 000 — 1M MAD',      min: 500000,   max: 1000000 },
  { value: '1000000-5000000',   label: '1M — 5M MAD',           min: 1000000,  max: 5000000 },
  { value: '5000000-10000000',  label: '5M — 10M MAD',          min: 5000000,  max: 10000000 },
  { value: '10000000-50000000', label: '10M — 50M MAD',         min: 10000000, max: 50000000 },
  { value: '50000000-',         label: 'Plus de 50M MAD',       min: 50000000, max: null },
]

const STEPS = [
  { n: 0, label: 'Nom',       shortLabel: '1', icon: Tag        },
  { n: 1, label: 'Où',        shortLabel: '2', icon: MapPin     },
  { n: 2, label: 'Quoi',      shortLabel: '3', icon: Building2  },
  { n: 3, label: 'Profil',    shortLabel: '4', icon: Users2     },
  { n: 4, label: 'Champs',    shortLabel: '5', icon: Wallet     },
  { n: 5, label: 'Confirmer', shortLabel: '6', icon: CheckCircle2 },
]

const FIELD_ICONS: Record<string, React.ElementType> = {
  basic: Building2, phone: Phone, email: Mail, address: MapPin,
  website: Globe, ice: ShieldCheck, annee_creation: Calendar,
  director: UserRound, effectif: Users2, capital: Banknote,
}

// ── Small reusable "all vs specific" toggle used for cities/effectif/capital ──
function ScopeToggle({ allLabel, specificLabel, isSpecific, onChange }: {
  allLabel: string; specificLabel: string; isSpecific: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
      <button onClick={() => onChange(false)}
        className={cn('px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors',
          !isSpecific ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
        {allLabel}
      </button>
      <button onClick={() => onChange(true)}
        className={cn('px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors',
          isSpecific ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
        {specificLabel}
      </button>
    </div>
  )
}

export default function SearchWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // ── Step 0: name ──────────────────────────────────────────
  const [queryName, setQueryName] = useState('')

  // ── Step 1: location ─────────────────────────────────────
  const [cityScopeSpecific, setCityScopeSpecific] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [availableCities, setAvailableCities] = useState<CityRow[]>([])

  // ── Step 2: taxonomy ──────────────────────────────────────
  const [tree, setTree] = useState<TaxSector[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [taxSearch, setTaxSearch] = useState('')
  const [selectedTaxIds, setSelectedTaxIds] = useState<Set<number>>(new Set())
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set())
  const [expandedDomaines, setExpandedDomaines] = useState<Set<string>>(new Set())

  // ── Step 3: profile ───────────────────────────────────────
  const [effectifScopeSpecific, setEffectifScopeSpecific] = useState(false)
  const [effectifTranches, setEffectifTranches] = useState<string[]>([])
  const [capitalScopeSpecific, setCapitalScopeSpecific] = useState(false)
  const [capitalTranches, setCapitalTranches] = useState<string[]>([])

  // ── Step 4: fields ────────────────────────────────────────
  const [selectedFields, setSelectedFields] = useState<Set<FieldGroupId>>(new Set(['basic']))
  const [maxCompanies, setMaxCompanies] = useState(50)

  // ── Live estimate ─────────────────────────────────────────
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const [liveCost, setLiveCost]   = useState<number | null>(null)
  const [fieldCoverage, setFieldCoverage] = useState<Record<string, number>>({})
  const [balance, setBalance] = useState<number | null>(null)
  const [freeTrialEligible, setFreeTrialEligible] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef = useRef(0)

  const effectiveCities = cityScopeSpecific ? cities : []
  const effectiveEffectifs = effectifScopeSpecific ? effectifTranches : []
  const effectiveCapitalTranches = capitalScopeSpecific ? capitalTranches : []

  const capitalMin = effectiveCapitalTranches.length === 0 ? undefined :
    Math.min(...effectiveCapitalTranches.map(v => CAPITAL_TRANCHES.find(t => t.value === v)!.min))
  const capitalMax = effectiveCapitalTranches.length === 0 ? undefined :
    (effectiveCapitalTranches.some(v => CAPITAL_TRANCHES.find(t => t.value === v)!.max === null) ? undefined :
      Math.max(...effectiveCapitalTranches.map(v => CAPITAL_TRANCHES.find(t => t.value === v)!.max as number)))

  // ── Load cities once; reload taxonomy tree whenever the active city
  // scope changes, so Step 2 reflects Step 1's choice ──
  useEffect(() => {
    fetch('/api/v2/cities').then(r => r.json()).then(setAvailableCities)
  }, [])

  useEffect(() => {
    setTreeLoading(true)
    const params = effectiveCities.length ? `?cities=${effectiveCities.map(encodeURIComponent).join(',')}` : ''
    fetch(`/api/v2/taxonomy${params}`).then(r => r.json()).then(d => { setTree(d); setTreeLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityScopeSpecific, cities.join(',')])

  const runEstimate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setEstimating(true)
    debounceRef.current = setTimeout(async () => {
      const myId = ++reqIdRef.current
      try {
        const res = await fetch('/api/v2/search/estimate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taxonomyIds: [...selectedTaxIds], cities: effectiveCities, name: '',
            effectifTranches: effectiveEffectifs, capitalMin, capitalMax,
            fields: [...selectedFields], limit: maxCompanies,
          }),
        })
        const d = await res.json()
        if (myId !== reqIdRef.current) return
        if (!res.ok) { setLiveCount(0); setLiveCost(0); return }
        setLiveCount(d.count ?? 0)
        setLiveCost(d.estimatedCost ?? 0)
        setFieldCoverage(d.fieldCoverage ?? {})
        setBalance(typeof d.balance === 'number' ? d.balance : null)
        setFreeTrialEligible(d.freeTrialEligible === true)
      } finally {
        if (myId === reqIdRef.current) setEstimating(false)
      }
    }, 350)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaxIds, effectiveCities.join(','), effectiveEffectifs.join(','), capitalMin, capitalMax, selectedFields, maxCompanies])

  useEffect(() => { runEstimate() }, [runEstimate])

  function toggleCity(c: string) {
    setCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  function toggleTax(id: number) {
    setSelectedTaxIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSectorAll(sector: TaxSector, checked: boolean) {
    setSelectedTaxIds(prev => {
      const n = new Set(prev)
      for (const d of sector.domaines) for (const a of d.activites) checked ? n.add(a.id) : n.delete(a.id)
      return n
    })
  }
  function toggleField(f: FieldGroupId) {
    if (f === 'basic') return
    setSelectedFields(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n })
  }

  async function launch() {
    setLaunching(true); setLaunchError(null)
    try {
      const res = await fetch('/api/v2/search/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxonomyIds: [...selectedTaxIds], cities: effectiveCities,
          effectifTranches: effectiveEffectifs, capitalMin, capitalMax,
          fields: [...selectedFields], limit: maxCompanies,
          queryName: queryName.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setLaunchError(d.error || 'Erreur'); setLaunching(false); return }
      router.push(`/databases/${d.queryId}`)
    } catch {
      setLaunchError('Erreur réseau')
      setLaunching(false)
    }
  }

  const filteredTree = taxSearch.trim()
    ? tree.map(s => ({
        ...s,
        domaines: s.domaines.map(d => ({
          ...d,
          activites: d.activites.filter(a => a.activite.toLowerCase().includes(taxSearch.toLowerCase())),
        })).filter(d => d.activites.length > 0 || d.domaine.toLowerCase().includes(taxSearch.toLowerCase())),
      })).filter(s => s.domaines.length > 0 || s.sector.toLowerCase().includes(taxSearch.toLowerCase()))
    : tree

  const filteredCities = citySearch.trim()
    ? availableCities.filter(c => c.city.toLowerCase().includes(citySearch.toLowerCase()))
    : availableCities.slice(0, 30)

  const canGoNext = step < 5
  const canGoBack = step > 0
  const autoName = effectiveCities.length ? `Recherche — ${effectiveCities[0]}${effectiveCities.length>1?` +${effectiveCities.length-1}`:''}` : 'Nouvelle recherche'

  return (
    <div className="max-w-[1000px] mx-auto py-6 sm:py-8 px-3 sm:px-4">
      {/* Step indicator — compact on mobile (numbers only), full labels on larger screens */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 overflow-x-auto no-scrollbar pb-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 min-w-[44px]">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              disabled={s.n > step}
              className={cn(
                'flex flex-col items-center gap-1 sm:gap-1.5 transition-colors shrink-0',
                s.n === step ? 'text-indigo-600' : s.n < step ? 'text-indigo-400 cursor-pointer' : 'text-gray-300'
              )}
            >
              <div className={cn(
                'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                s.n === step ? 'border-indigo-600 bg-indigo-50' :
                s.n < step   ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
              )}>
                {s.n < step ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>
              <span className="text-[9px] sm:text-[11px] font-semibold hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-1 sm:mx-2 rounded-full min-w-[10px]', s.n < step ? 'bg-indigo-300' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Live counter — hidden on the naming step, sticky everywhere else */}
      {step > 0 && (
        <div className="sticky top-2 z-20 mb-5 sm:mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Entreprises correspondantes</p>
              <div className="flex items-center gap-2">
                {estimating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                ) : (
                  <span className="text-[22px] sm:text-[28px] font-extrabold text-gray-900 tabular-nums">
                    {(liveCount ?? 0).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            {step >= 4 && (
              <div className="text-right">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Coût estimé</p>
                <span className="text-[18px] sm:text-[24px] font-extrabold text-indigo-600 tabular-nums">
                  {freeTrialEligible ? 'Gratuit' : `${(liveCost ?? 0).toLocaleString('fr-FR')} cr`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step content ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 min-h-[420px]">

        {/* STEP 0 — Name the search */}
        {step === 0 && (
          <div className="max-w-[480px] mx-auto py-6 sm:py-10 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Tag className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-[22px] sm:text-[24px] font-bold text-gray-900 mb-2">Comment appeler cette recherche ?</h2>
            <p className="text-[13px] text-gray-400 mb-6">Ça vous aide à la retrouver plus tard dans &quot;Mes sélections&quot;. Vous pouvez laisser vide — on lui donnera un nom automatiquement.</p>
            <input
              value={queryName}
              onChange={e => setQueryName(e.target.value)}
              placeholder={autoName}
              className="input text-center text-[15px] font-medium"
              autoFocus
            />
          </div>
        )}

        {/* STEP 1 — Location */}
        {step === 1 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Où cherchez-vous ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-4">Cherchez partout au Maroc, ou choisissez des villes précises.</p>
            <ScopeToggle
              allLabel="🇲🇦 Tout le Maroc"
              specificLabel="📍 Villes spécifiques"
              isSpecific={cityScopeSpecific}
              onChange={setCityScopeSpecific}
            />
            {cityScopeSpecific && (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={citySearch} onChange={e => setCitySearch(e.target.value)}
                    placeholder="Rechercher une ville..."
                    className="input pl-9" />
                </div>
                {cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cities.map(c => (
                      <span key={c} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-pill px-3 py-1.5 text-[13px] font-semibold">
                        {c}
                        <button onClick={() => toggleCity(c)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto">
                  {filteredCities.map(c => (
                    <button key={c.city} onClick={() => toggleCity(c.city)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-colors text-left',
                        cities.includes(c.city) ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-100 hover:border-gray-200 text-gray-700'
                      )}>
                      <span className="truncate">{c.city}</span>
                      <span className="text-[11px] text-gray-400 shrink-0 ml-1">{c.count.toLocaleString('fr-FR')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!cityScopeSpecific && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <Globe2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-[12.5px] text-emerald-700">Votre recherche couvrira toutes les villes du Maroc.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Business type (taxonomy) */}
        {step === 2 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Quel type d&apos;entreprise ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-4">Cochez un secteur entier ou affinez jusqu&apos;à l&apos;activité précise. Laissez vide pour tout inclure.</p>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={taxSearch} onChange={e => setTaxSearch(e.target.value)}
                placeholder="Rechercher un secteur, domaine, activité..."
                className="input pl-9" />
            </div>
            {treeLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto space-y-1">
                {filteredTree.map(sector => {
                  const sectorTaxIds = sector.domaines.flatMap(d => d.activites.map(a => a.id))
                  const checkedCount = sectorTaxIds.filter(id => selectedTaxIds.has(id)).length
                  const allChecked = checkedCount === sectorTaxIds.length && sectorTaxIds.length > 0
                  const isExpanded = expandedSectors.has(sector.sector)
                  return (
                    <div key={sector.sector} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSectors(p => { const n = new Set(p); n.has(sector.sector) ? n.delete(sector.sector) : n.add(sector.sector); return n })}
                        className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                        <input type="checkbox" checked={allChecked} onChange={e => { e.stopPropagation(); toggleSectorAll(sector, !allChecked) }}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded accent-indigo-600 shrink-0" />
                        <span className="flex-1 font-semibold text-[13px] sm:text-[14px] text-gray-800 truncate">{sector.sector}</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-pill px-2 py-0.5 shrink-0">
                          {sector.totalCount.toLocaleString('fr-FR')}
                        </span>
                        {checkedCount > 0 && !allChecked && (
                          <span className="shrink-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {checkedCount > 9 ? '9+' : checkedCount}
                          </span>
                        )}
                        <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform shrink-0', isExpanded && 'rotate-90')} />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                          {sector.domaines.map(dom => {
                            const domKey = `${sector.sector}::${dom.domaine}`
                            const domExpanded = expandedDomaines.has(domKey)
                            return (
                              <div key={dom.domaine}>
                                <button
                                  onClick={() => setExpandedDomaines(p => { const n = new Set(p); n.has(domKey) ? n.delete(domKey) : n.add(domKey); return n })}
                                  className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 pl-7 sm:pl-10 hover:bg-gray-100 transition-colors text-left">
                                  <span className="flex-1 text-[12px] sm:text-[12.5px] font-medium text-gray-600 truncate">{dom.domaine}</span>
                                  <span className="text-[10px] text-gray-400 shrink-0">{dom.totalCount.toLocaleString('fr-FR')}</span>
                                  <ChevronRight className={cn('w-3.5 h-3.5 text-gray-300 transition-transform shrink-0', domExpanded && 'rotate-90')} />
                                </button>
                                {domExpanded && (
                                  <div className="pl-11 sm:pl-14 pr-3 sm:pr-4 pb-2 space-y-0.5">
                                    {dom.activites.map(act => (
                                      <label key={act.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                                        <input type="checkbox" checked={selectedTaxIds.has(act.id)} onChange={() => toggleTax(act.id)}
                                          className="w-3.5 h-3.5 rounded accent-indigo-600 shrink-0" />
                                        <span className="flex-1 text-[11.5px] sm:text-[12px] text-gray-600">{act.activite}</span>
                                        <span className="text-[10px] text-gray-400 shrink-0">{act.count}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Size & Capital */}
        {step === 3 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Quel profil d&apos;entreprise ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-5">Optionnel — affinez par taille d&apos;équipe ou capital social.</p>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Effectif (salariés)</p>
                <ScopeToggle allLabel="Tous" specificLabel="Tranches précises" isSpecific={effectifScopeSpecific} onChange={setEffectifScopeSpecific} />
                {effectifScopeSpecific && (
                  <div className="space-y-1.5">
                    {EFFECTIF_TRANCHES.map(t => (
                      <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={effectifTranches.includes(t)}
                          onChange={() => setEffectifTranches(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])}
                          className="w-4 h-4 rounded accent-indigo-600" />
                        <span className="text-[13px] text-gray-700">{t}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Capital social</p>
                <ScopeToggle allLabel="Tous" specificLabel="Tranches précises" isSpecific={capitalScopeSpecific} onChange={setCapitalScopeSpecific} />
                {capitalScopeSpecific && (
                  <div className="space-y-1.5">
                    {CAPITAL_TRANCHES.map(t => (
                      <label key={t.value} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={capitalTranches.includes(t.value)}
                          onChange={() => setCapitalTranches(p => p.includes(t.value) ? p.filter(x=>x!==t.value) : [...p,t.value])}
                          className="w-4 h-4 rounded accent-indigo-600" />
                        <span className="text-[13px] text-gray-700">{t.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {(effectifScopeSpecific || capitalScopeSpecific) && (
              <div className="mt-5 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[12.5px] text-amber-700">
                  Ces informations ne sont pas toujours renseignées — le nombre affiché ne reflète que les entreprises où elles sont connues.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Fields to unlock */}
        {step === 4 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Quelles données débloquer ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-5">Le coût s&apos;actualise en direct selon ce qui est réellement disponible pour vos résultats.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.values(FIELD_GROUPS) as (typeof FIELD_GROUPS)[FieldGroupId][]).map(g => {
                const Icon = FIELD_ICONS[g.id] ?? Building2
                const checked = g.id === 'basic' || selectedFields.has(g.id as FieldGroupId)
                const coverage = fieldCoverage[g.id]
                return (
                  <label key={g.id} className={cn(
                    'flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-colors',
                    checked ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-100 hover:border-gray-200',
                    g.id === 'basic' && 'opacity-90 cursor-default'
                  )}>
                    <input type="checkbox" checked={checked} disabled={g.id === 'basic'}
                      onChange={() => toggleField(g.id as FieldGroupId)}
                      className="w-4 h-4 rounded accent-indigo-600 mt-0.5 shrink-0" />
                    <Icon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[13px] sm:text-[13.5px] text-gray-800">{g.label}</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 bg-white border border-indigo-200 rounded-pill px-2 py-0.5 shrink-0">
                          {g.cost} cr
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-[11.5px] text-gray-400 mt-0.5">{g.description}</p>
                      {typeof coverage === 'number' && (
                        <p className={cn('text-[10.5px] sm:text-[11px] font-semibold mt-1', coverage >= 60 ? 'text-emerald-600' : coverage >= 30 ? 'text-amber-600' : 'text-red-500')}>
                          Disponible pour {coverage}% de vos résultats
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="mt-5">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Nombre d&apos;entreprises max</p>
              <div className="flex flex-wrap gap-2">
                {[10, 25, 50, 100, 500, 1000, 5000].map(n => (
                  <button key={n} onClick={() => setMaxCompanies(n)}
                    className={cn('px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors',
                      maxCompanies === n ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                    {n.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Review */}
        {step === 5 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Vérifiez et lancez</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-5">Dernière étape — rien ne sera débité tant que vous n&apos;avez pas confirmé.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><Tag className="w-3.5 h-3.5" />Nom</span>
                <span className="text-[13px] font-semibold text-gray-800">{queryName.trim() || autoName}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Villes</span>
                <span className="text-[13px] font-semibold text-gray-800">{effectiveCities.length ? effectiveCities.join(', ') : 'Tout le Maroc'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><ListChecks className="w-3.5 h-3.5" />Activités</span>
                <span className="text-[13px] font-semibold text-gray-800">{selectedTaxIds.size || 'Toutes'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><Wallet className="w-3.5 h-3.5" />Champs à débloquer</span>
                <span className="text-[13px] font-semibold text-gray-800">{[...selectedFields].map(f => FIELD_GROUPS[f].label).join(', ')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-[14px] font-bold text-indigo-800">Résultat</span>
                <span className="text-[14px] font-bold text-indigo-800">
                  {(liveCount ?? 0).toLocaleString('fr-FR')} entreprises · {freeTrialEligible ? 'Gratuit' : `${(liveCost ?? 0).toLocaleString('fr-FR')} cr`}
                </span>
              </div>
              {balance !== null && !freeTrialEligible && (
                <div className="flex items-center justify-between px-4 text-[12.5px] text-gray-400">
                  <span>Solde après recherche</span>
                  <span className={cn('font-semibold', (balance - (liveCost ?? 0)) < 0 ? 'text-red-500' : 'text-gray-600')}>
                    {(balance - (liveCost ?? 0)).toLocaleString('fr-FR')} cr
                  </span>
                </div>
              )}
            </div>
            {launchError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">{launchError}</div>
            )}
            <button onClick={launch} disabled={launching || !liveCount}
              className="w-full mt-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-[15px] hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {launching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              Lancer la recherche
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={!canGoBack}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[13px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-0 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        {canGoNext && (
          <button onClick={() => setStep(s => Math.min(5, s+1))}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Continuer <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
