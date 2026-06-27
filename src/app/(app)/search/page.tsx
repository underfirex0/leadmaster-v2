'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, ChevronDown, CheckSquare, Square, Minus,
  X, MapPin, Zap, RotateCcw, Info, Phone, Mail, Globe, User,
  Building2, FileText, Share2, Loader2, AlertCircle, Check,
  Calendar, DollarSign, Gift, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_GROUPS, EFFECTIF_TRANCHES } from '@/lib/constants'
import type { NomenclatureSector, NomenclatureActivite } from '@/types'

type CheckState = 'none'|'all'|'partial'

const FIELD_IDS = Object.keys(FIELD_GROUPS).filter(k => k !== 'basic') as (keyof typeof FIELD_GROUPS)[]

const FIELD_ICONS: Record<string, React.ElementType> = {
  phone:Phone, email:Mail, address:MapPin, website:Globe,
  director:User, ice:Building2, annee_creation:Calendar,
  capital:DollarSign, social:Share2,
}

const PRESETS = [
  { id:'light',    label:'Contact léger',   fields:['phone'],                  desc:'~2 cr/biz' },
  { id:'standard', label:'Profil standard', fields:['phone','email'],           desc:'~3 cr/biz' },
  { id:'qualified',label:'Profil qualifié', fields:['phone','email','director'],desc:'~5 cr/biz' },
  { id:'complete', label:'Profil complet',  fields:FIELD_IDS,                  desc:'~16 cr/biz' },
]

const SIZES = [10,25,50,100,500,'1k','5k','10k']
const SIZE_VALUES: Record<string, number> = { '1k':1000, '5k':5000, '10k':10000 }

// ── Nomenclature tree ─────────────────────────────────────────
function CheckIcon({ state, sm }: { state:CheckState; sm?:boolean }) {
  const s = sm?'w-3.5 h-3.5':'w-4 h-4'
  if (state==='all')     return <CheckSquare className={cn(s,'text-indigo-600 shrink-0')}/>
  if (state==='partial') return <Minus       className={cn(s,'text-indigo-400 shrink-0')}/>
  return <Square className={cn(s,'text-gray-300 shrink-0')}/>
}

function SectorNode({ sector, selected, onToggle, search }: {
  sector: NomenclatureSector; selected:Set<string>
  onToggle:(v:string,on:boolean)=>void; search:string
}) {
  const [open, setOpen] = useState(false)
  const allSlugs = useMemo(() =>
    sector.domaines.flatMap(d => d.activites.flatMap(a => a.rubs.map(r => r.rub_slug))), [sector])
  const cnt = allSlugs.filter(s => selected.has(s)).length
  const state: CheckState = cnt===allSlugs.length&&allSlugs.length>0?'all':cnt>0?'partial':'none'

  // Filtered domaines for search
  const filteredDomaines = useMemo(() => {
    if (!search) return sector.domaines
    const q = search.toLowerCase()
    return sector.domaines
      .map(d => ({ ...d, activites: d.activites.filter(a =>
        a.activite.toLowerCase().includes(q) || a.rubs.some(r => r.rub.toLowerCase().includes(q))
      )}))
      .filter(d => d.activites.length>0 || d.domaine.toLowerCase().includes(q))
  }, [sector.domaines, search])

  useEffect(() => { if (search && filteredDomaines.length>0) setOpen(true) }, [search, filteredDomaines.length])
  if (search && filteredDomaines.length===0) return null

  function toggleAll() {
    if (state==='all') allSlugs.forEach(s=>onToggle(s,false))
    else allSlugs.forEach(s=>onToggle(s,true))
  }

  return (
    <div className={cn('border rounded-2xl overflow-hidden transition-all',state!=='none'?'border-indigo-200 shadow-sm':'border-gray-100')}>
      <div className={cn('flex items-center gap-2.5 px-3.5 py-3',state!=='none'?'bg-indigo-50':'hover:bg-gray-50')}>
        <div onClick={toggleAll} className="cursor-pointer shrink-0"><CheckIcon state={state}/></div>
        <div onClick={()=>setOpen(!open)} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
          <span className={cn('font-semibold text-[13.5px] flex-1 truncate',state!=='none'?'text-indigo-800':'text-gray-800')}>{sector.sector}</span>
          <span className="text-[11.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 shrink-0">{sector.totalRubs.toLocaleString('fr-FR')}</span>
          {open?<ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0"/>:<ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0"/>}
        </div>
        {cnt>0&&<span className="shrink-0 bg-indigo-600 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{cnt>9?'9+':cnt}</span>}
      </div>
      {open&&(
        <div className="border-t border-gray-100 bg-white p-2 space-y-0.5">
          {filteredDomaines.map(dom => {
            const domSlugs = dom.activites.flatMap(a => a.rubs.map(r=>r.rub_slug))
            const domCnt = domSlugs.filter(s=>selected.has(s)).length
            const domState: CheckState = domCnt===domSlugs.length&&domSlugs.length>0?'all':domCnt>0?'partial':'none'
            return (
              <div key={dom.domaine}>
                {sector.domaines.length>1&&(
                  <div onClick={()=>{ if(domState==='all')domSlugs.forEach(s=>onToggle(s,false));else domSlugs.forEach(s=>onToggle(s,true)) }}
                    className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-[11.5px] font-bold uppercase tracking-wide transition-colors mt-1',
                      domState!=='none'?'text-indigo-700 bg-indigo-50':'text-gray-400 hover:bg-gray-50')}>
                    <CheckIcon state={domState} sm/>
                    <span className="flex-1">{dom.domaine}</span>
                    {/* COMPANY COUNT on domaine */}
                    <span className={cn('text-[11px] font-semibold rounded-full px-1.5 py-0.5',domState!=='none'?'text-indigo-600':'text-gray-400')}>
                      {dom.totalRubs.toLocaleString('fr-FR')}
                    </span>
                  </div>
                )}
                {dom.activites.map(act => {
                  const slugs = act.rubs.map(r=>r.rub_slug)
                  const actCnt = slugs.filter(s=>selected.has(s)).length
                  const actState: CheckState = actCnt===slugs.length&&slugs.length>0?'all':actCnt>0?'partial':'none'
                  // Company count is stored as 'count' on the activite object
                  const companyCount = (act as unknown as Record<string,unknown>).count as number ?? act.rubs.length
                  return (
                    <div key={act.activite}
                      onClick={()=>{ if(actState==='all')slugs.forEach(s=>onToggle(s,false));else slugs.forEach(s=>onToggle(s,true)) }}
                      className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-[13px] transition-colors',
                        actState!=='none'?'bg-indigo-50 text-indigo-700':'hover:bg-gray-50 text-gray-600')}>
                      <CheckIcon state={actState} sm/>
                      <span className="flex-1 truncate">{act.activite}</span>
                      {/* COMPANY COUNT on activite */}
                      <span className={cn('text-[11px] shrink-0',actState!=='none'?'text-indigo-500':'text-gray-400')}>
                        {companyCount.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Confirmation Modal ────────────────────────────────────────
function ConfirmModal({ data, onConfirm, onCancel, launching }: {
  data: { count:number; actualLimit:number; estimatedCost:number; fieldCoverage:Record<string,number>; fieldCounts:Record<string,number>; freeTrialEligible:boolean }
  onConfirm: () => void; onCancel: () => void; launching: boolean
}) {
  const FIELD_LABELS: Record<string,string> = {
    basic:'Profil de base', phone:'Téléphone', email:'E-mail', address:'Adresse',
    website:'Site web', ice:'ICE', annee_creation:'Année création', director:'Dirigeant', capital:'Capital',
  }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600"/>
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-gray-900">Résumé de la recherche</h2>
            <p className="text-[13px] text-gray-400">Confirmez avant de débloquer</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Total */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
            <div className="text-[32px] font-bold text-indigo-700 font-mono">{data.actualLimit.toLocaleString('fr-FR')}</div>
            <div className="text-[13px] text-indigo-500">entreprises à débloquer</div>
            <div className="text-[12px] text-indigo-400 mt-0.5">sur {data.count.toLocaleString('fr-FR')} correspondant à vos critères</div>
          </div>

          {/* Field breakdown */}
          <div className="space-y-2">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">Données disponibles</p>
            {Object.entries(data.fieldCounts).map(([field, cnt]) => {
              const pct = data.fieldCoverage[field] ?? 0
              return (
                <div key={field} className="flex items-center gap-3">
                  <div className="w-28 text-[12.5px] text-gray-600 shrink-0">{FIELD_LABELS[field]??field}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full',pct>70?'bg-emerald-400':pct>40?'bg-amber-400':'bg-red-300')}
                      style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-[12px] font-semibold text-gray-700 shrink-0 w-20 text-right">
                    {cnt.toLocaleString('fr-FR')} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>

          {/* Cost */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <span className="text-[14px] font-bold text-gray-800">Coût réel estimé</span>
            <span className={cn('text-[18px] font-bold', data.freeTrialEligible?'text-emerald-600':'text-indigo-700')}>
              {data.freeTrialEligible ? '🎁 GRATUIT' : `${data.estimatedCost.toLocaleString('fr-FR')} cr`}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[14px]">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={launching}
            className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
            {launching?<><Loader2 className="w-4 h-4 animate-spin"/>Démarrage...</>:
              data.freeTrialEligible?'🎁 Obtenir gratuitement':'✓ Confirmer et débloquer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function SearchPage() {
  const router = useRouter()
  const [tree, setTree]         = useState<NomenclatureSector[]>([])
  const [loadingTree, setLoadingTree] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cities, setCities]     = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const [treeSearch, setTreeSearch] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['phone','email']))
  const [maxCompanies, setMaxCompanies] = useState(50)
  const [capitalTranche, setCapitalTranche] = useState('-')
  const [effectifTranche, setEffectifTranche] = useState('-')
  const [liveCount, setLiveCount] = useState<number|null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [balance, setBalance]   = useState<number|null>(null)
  const [freeTrialAvail, setFreeTrialAvail] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [launching, setLaunching]   = useState(false)
  const [confirmData, setConfirmData] = useState<{
    count:number;actualLimit:number;estimatedCost:number;
    fieldCoverage:Record<string,number>;fieldCounts:Record<string,number>;freeTrialEligible:boolean
  }|null>(null)
  const [toast, setToast] = useState<{msg:string;type:'error'|'success'}|null>(null)
  const debounceRef    = useRef<ReturnType<typeof setTimeout>|null>(null)
  const nomDebounceRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const cityRef = useRef<HTMLDivElement>(null)

  // Capital tranche values
  const TRANCHES: Record<string,[string,string]> = {
    '-':             ['',''],
    '0-100000':      ['0','100000'],
    '100000-500000': ['100000','500000'],
    '500000-1000000':['500000','1000000'],
    '1000000-5000000':['1000000','5000000'],
    '5000000-10000000':['5000000','10000000'],
    '10000000-50000000':['10000000','50000000'],
    '50000000-':     ['50000000',''],
  }
  const [capitalMin, capitalMax] = TRANCHES[capitalTranche] ?? ['','']

  useEffect(() => {
    fetch('/api/me/balance').then(r=>r.json()).then(d=>setBalance(d.balance))
    fetch('/api/search/cities').then(r=>r.json()).then(d=>setAllCities(d.cities??[]))
    // Check free trial
    fetch('/api/search/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:['basic'],limit:100})})
      .then(r=>r.json()).then(d=>setFreeTrialAvail(d.freeTrialEligible??false))
  }, [])

  // Nomenclature tree — refetches with city/name filters so sector counts update live
  useEffect(() => {
    if (nomDebounceRef.current) clearTimeout(nomDebounceRef.current)
    setLoadingTree(true)
    // Name filter uses 600ms debounce; city/reset changes are instant
    const delay = nameSearch ? 600 : 0
    nomDebounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (cities.length)        params.set('cities', cities.join(','))
        if (nameSearch.trim())    params.set('name',   nameSearch.trim())
        const r = await fetch(`/api/nomenclature?${params}`)
        const d = await r.json()
        setTree(d)
      } catch { /* silent */ }
      finally { setLoadingTree(false) }
    }, delay)
    return () => { if (nomDebounceRef.current) clearTimeout(nomDebounceRef.current) }
  }, [cities, nameSearch])

  // Close city dropdown on outside click
  useEffect(() => {
    const fn = (e:MouseEvent) => { if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Live count — debounced 600ms
  useEffect(() => {
    const hasFilters = selected.size>0 || cities.length>0 || nameSearch.trim() || capitalTranche!=='-' || effectifTranche!=='-'
    if (!hasFilters) { setLiveCount(null); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLiveLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/search/estimate',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ activites:[...selected], cities, name:nameSearch,
            fields:[...selectedFields,'basic'], limit:maxCompanies,
            capital_min:capitalMin||undefined, capital_max:capitalMax||undefined,
            effectif: effectifTranche!=='-'?effectifTranche:undefined }),
        })
        const d = await r.json()
        setLiveCount(d.count??0)
        setBalance(d.balance)
        setFreeTrialAvail(d.freeTrialEligible??false)
      } finally { setLiveLoading(false) }
    }, 600)
  }, [selected, cities, nameSearch, selectedFields, maxCompanies, capitalTranche, effectifTranche])

  const toggleRub = useCallback((slug:string,on:boolean) => {
    setSelected(prev=>{const n=new Set(prev);on?n.add(slug):n.delete(slug);return n})
  },[])

  function toggleField(fid:string) {
    setSelectedFields(prev=>{const n=new Set(prev);n.has(fid)?n.delete(fid):n.add(fid);return n})
  }
  function applyPreset(fields:string[]) { setSelectedFields(new Set(fields)) }

  // When capital tranche selected → auto-check capital field
  function handleCapitalTranche(val:string) {
    setCapitalTranche(val)
    if (val !== '-') setSelectedFields(prev => new Set([...prev,'capital']))
  }

  // When effectif tranche selected → auto-check effectif field
  function handleEffectifTranche(val:string) {
    setEffectifTranche(val)
    if (val !== '-') setSelectedFields(prev => new Set([...prev,'effectif']))
  }

  const costPerBiz = useMemo(() => {
    const base = FIELD_GROUPS.basic.cost
    const extra = Object.entries(FIELD_GROUPS)
      .filter(([k])=>k!=='basic'&&selectedFields.has(k))
      .reduce((s,[,v])=>s+v.cost,0)
    return base+extra
  }, [selectedFields])

  const maxEstCost = costPerBiz * maxCompanies
  const hasFilter = selected.size>0 || cities.length>0 || nameSearch.trim() || capitalTranche!=='-' || effectifTranche!=='-'
  const isFreeTrial = freeTrialAvail && selectedFields.size===0 && maxCompanies<=100

  const filteredCities = useMemo(() =>
    citySearch ? allCities.filter(c=>c.toLowerCase().includes(citySearch.toLowerCase())) : allCities
  ,[allCities, citySearch])

  function showToast(msg:string,type:'error'|'success'='error') {
    setToast({msg,type}); setTimeout(()=>setToast(null),4000)
  }

  // Step 1: Estimate + show confirmation modal
  async function handleLaunch() {
    if (!hasFilter && !isFreeTrial) { showToast('Ajoutez au moins un filtre (secteur, ville...)','error'); return }
    if (!selectedFields.size && !isFreeTrial) { showToast('Sélectionnez au moins un champ à débloquer','error'); return }
    setEstimating(true)
    try {
      const r = await fetch('/api/search/estimate',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ activites:[...selected], cities, name:nameSearch,
          fields:[...selectedFields], limit:maxCompanies,
          capital_min:capitalMin||undefined, capital_max:capitalMax||undefined,
            effectif: effectifTranche!=='-'?effectifTranche:undefined }),
      })
      const d = await r.json()
      if (!r.ok) { showToast(d.error||'Erreur estimation','error'); return }
      if (d.count===0) { showToast('Aucune entreprise trouvée avec ces critères','error'); return }
      setConfirmData(d)
    } catch { showToast('Erreur réseau','error') }
    finally { setEstimating(false) }
  }

  // Step 2: Execute after confirmation
  async function handleConfirm() {
    setLaunching(true)
    try {
      const r = await fetch('/api/search/execute',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ activites:[...selected], cities, name:nameSearch,
          fields:[...selectedFields], limit:maxCompanies,
          capital_min:capitalMin||undefined, capital_max:capitalMax||undefined,
            effectif: effectifTranche!=='-'?effectifTranche:undefined }),
      })
      const d = await r.json()
      if (!r.ok) { setConfirmData(null); showToast(d.error||'Erreur','error'); return }
      if (d.newBalance!==undefined) setBalance(d.newBalance)
      router.push('/databases')
    } catch { showToast('Erreur réseau','error') }
    finally { setLaunching(false) }
  }

  function getSizeValue(s: string|number): number {
    if (typeof s==='number') return s
    return SIZE_VALUES[s] ?? parseInt(String(s)) ?? 50
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast&&(
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-[13.5px] font-semibold text-white max-w-sm',
          toast.type==='error'?'bg-red-500':'bg-emerald-600')}>
          {toast.msg}
        </div>
      )}
      {confirmData&&(
        <ConfirmModal data={confirmData} launching={launching}
          onConfirm={handleConfirm} onCancel={()=>setConfirmData(null)}/>
      )}

      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Nouvelle recherche</h1>
          <p className="text-gray-400 text-[14px] mt-1">Sélectionnez vos cibles, choisissez vos champs et lancez.</p>
        </div>

        {/* Free trial banner */}
        {freeTrialAvail&&(
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Gift className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"/>
            <div>
              <div className="font-bold text-emerald-800 text-[14px]">Essai gratuit disponible !</div>
              <div className="text-emerald-600 text-[13px]">Obtenez 100 entreprises gratuitement avec le profil de base. Ne cochez aucun champ supplémentaire et choisissez max 100 entreprises.</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* LEFT */}
          <div className="space-y-5">

            {/* Presets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5"/> Profils types (champs supplémentaires)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESETS.map(p=>{
                  const active = p.fields.length===selectedFields.size&&p.fields.every(f=>selectedFields.has(f))
                  const cost = 1+Object.entries(FIELD_GROUPS).filter(([k])=>k!=='basic'&&p.fields.includes(k)).reduce((s,[,v])=>s+v.cost,0)
                  return (
                    <button key={p.id} onClick={()=>applyPreset(p.fields)}
                      className={cn('text-left p-3 rounded-xl border-2 transition-all',
                        active?'border-indigo-500 bg-indigo-50':'border-gray-100 hover:border-indigo-200')}>
                      <div className={cn('font-semibold text-[12.5px]',active?'text-indigo-700':'text-gray-700')}>{p.label}</div>
                      <div className="text-[11px] text-gray-400">~{cost} cr/biz</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5"/> Filtres de ciblage
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="text-[12px] font-medium text-gray-500 mb-1 block">Nom d'entreprise</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                    <input value={nameSearch} onChange={e=>setNameSearch(e.target.value)}
                      placeholder="Recherche libre..."
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400"/>
                  </div>
                </div>

                {/* City — fixed with search inside dropdown */}
                <div ref={cityRef}>
                  <label className="text-[12px] font-medium text-gray-500 mb-1 block">Ville</label>
                  <div className="relative">
                    <button onClick={()=>setCityOpen(!cityOpen)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 bg-white">
                      <span className={cities.length?'text-gray-800':'text-gray-400'}>
                        {cities.length?(cities.length===1?cities[0]:`${cities.length} ville${cities.length>1?'s':''}`):'Toutes les villes'}
                      </span>
                      <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform',cityOpen&&'rotate-180')}/>
                    </button>
                    {cityOpen&&(
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                        {/* Search inside dropdown */}
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                            <input value={citySearch} onChange={e=>setCitySearch(e.target.value)}
                              placeholder="Rechercher une ville..."
                              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"/>
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto p-1.5">
                          {filteredCities.length===0?(
                            <div className="px-3 py-2 text-[12.5px] text-gray-400 text-center">Aucune ville trouvée</div>
                          ):filteredCities.map(c=>(
                            <label key={c} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 cursor-pointer text-[13px]">
                              <input type="checkbox" checked={cities.includes(c)}
                                onChange={()=>setCities(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])}
                                className="accent-indigo-600"/>
                              <span className="text-gray-700">{c}</span>
                            </label>
                          ))}
                        </div>
                        <div className="border-t px-3 py-2 flex justify-between">
                          <button onClick={()=>{setCities([]);setCitySearch('')}} className="text-[12px] text-gray-400 hover:text-gray-600">Effacer</button>
                          <button onClick={()=>setCityOpen(false)} className="text-[12px] font-semibold text-indigo-600">OK</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {cities.length>0&&(
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cities.map(c=>(
                        <span key={c} className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5">
                          {c}<button onClick={()=>setCities(p=>p.filter(x=>x!==c))}><X className="w-2.5 h-2.5"/></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Capital tranche */}
                <div className="sm:col-span-2">
                  <label className="text-[12px] font-medium text-gray-500 mb-1 block">Tranche de capital</label>
                  <select value={capitalTranche} onChange={e=>handleCapitalTranche(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400 bg-white">
                    <option value="-">Toutes les tranches</option>
                    <option value="0-100000">Moins de 100 000 MAD</option>
                    <option value="100000-500000">100 000 — 500 000 MAD</option>
                    <option value="500000-1000000">500 000 — 1 000 000 MAD</option>
                    <option value="1000000-5000000">1M — 5M MAD</option>
                    <option value="5000000-10000000">5M — 10M MAD</option>
                    <option value="10000000-50000000">10M — 50M MAD</option>
                    <option value="50000000-">Plus de 50M MAD</option>
                  </select>
                  {capitalTranche!=='-'&&(
                    <p className="text-[11.5px] text-amber-600 mt-1">💡 "Capital social" ajouté automatiquement à vos champs</p>
                  )}
                </div>

                {/* Effectif (tranche de salariés) */}
                <div className="sm:col-span-2">
                  <label className="text-[12px] font-medium text-gray-500 mb-1 block">Effectif (salariés)</label>
                  <select value={effectifTranche} onChange={e=>handleEffectifTranche(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400 bg-white">
                    <option value="-">Toutes les tailles</option>
                    {EFFECTIF_TRANCHES.map(t=>(
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {effectifTranche!=='-'&&(
                    <p className="text-[11.5px] text-amber-600 mt-1">💡 "Effectif" ajouté automatiquement à vos champs</p>
                  )}
                </div>
              </div>
            </div>

            {/* Nomenclature Tree */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-[14px] text-gray-800 flex items-center gap-2">
                    Secteurs d'activité
                    {liveLoading&&<Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin"/>}
                    {liveCount!==null&&!liveLoading&&(
                      <span className="text-[12px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                        {liveCount.toLocaleString('fr-FR')} entreprises
                      </span>
                    )}
                  </div>
                  {selected.size>0&&(
                    <button onClick={()=>setSelected(new Set())} className="text-[11.5px] text-indigo-600 flex items-center gap-1 font-medium">
                      <RotateCcw className="w-3 h-3"/>Décocher tout
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                  <input value={treeSearch} onChange={e=>setTreeSearch(e.target.value)}
                    placeholder="Rechercher un secteur, domaine, activité..."
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-[13px] focus:outline-none focus:border-indigo-400"/>
                  {treeSearch&&<button onClick={()=>setTreeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400"/></button>}
                </div>
              </div>
              <div className="p-3 max-h-[540px] overflow-y-auto space-y-2">
                {loadingTree?Array.from({length:6}).map((_,i)=><div key={i} className="h-12 bg-gray-100 rounded-2xl animate-pulse"/>):
                  tree.map(s=><SectorNode key={s.sector} sector={s} selected={selected} onToggle={toggleRub} search={treeSearch}/>)}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between text-[12px] text-gray-400">
                <span>{tree.reduce((s,t)=>s+t.totalRubs,0).toLocaleString('fr-FR')} entreprises au total</span>
                {selected.size>0&&<span className="text-indigo-600 font-semibold">{selected.size} activité{selected.size>1?'s':''} sélectionnée{selected.size>1?'s':''}</span>}
              </div>
            </div>

            {/* Fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-[14px] text-gray-800">🔓 Champs à débloquer</div>
                <button onClick={()=>setSelectedFields(new Set())} className="text-[12px] text-gray-400 hover:text-gray-600">Tout décocher</button>
              </div>
              {/* Basic always */}
              <div className="mb-4 p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[13px] text-indigo-800 flex items-center gap-2">
                      🏢 Profil de base <span className="text-[11px] font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-full px-2 py-0.5">INCLUS</span>
                    </div>
                    <div className="text-[12px] text-indigo-600 mt-0.5">Raison sociale · Ville · Secteur · Activités · Forme juridique · Réseaux sociaux</div>
                  </div>
                  <span className="font-bold text-indigo-700 text-[15px]">1 cr</span>
                </div>
              </div>
              <div className="mb-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-[12px] text-emerald-700">
                <span className="font-semibold">Aperçu gratuit :</span> Nom d'entreprise · Ville (toujours visible)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(FIELD_GROUPS).filter(([k])=>k!=='basic').map(([fid,fdef])=>{
                  const Icon = FIELD_ICONS[fid]||FileText
                  const on = selectedFields.has(fid)
                  return (
                    <label key={fid} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      on?'border-indigo-500 bg-indigo-50':'border-gray-100 hover:border-gray-200')}>
                      <input type="checkbox" checked={on} onChange={()=>toggleField(fid)} className="sr-only"/>
                      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',on?'bg-indigo-600 border-indigo-600':'border-gray-300')}>
                        {on&&<Check className="w-3 h-3 text-white"/>}
                      </div>
                      <Icon className={cn('w-3.5 h-3.5 shrink-0',on?'text-indigo-600':'text-gray-400')}/>
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-[13px] font-semibold',on?'text-indigo-700':'text-gray-700')}>{fdef.label}</div>
                        <div className="text-[11px] text-gray-400 truncate">{fdef.description}</div>
                      </div>
                      <span className={cn('text-[12px] font-bold shrink-0',on?'text-indigo-600':'text-gray-400')}>+{fdef.cost} cr</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT panel */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Volume */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Nombre d'entreprises</div>
              <div className="text-[48px] font-bold text-gray-900 font-mono tabular-nums leading-none">
                {maxCompanies>=1000?`${maxCompanies/1000}k`:maxCompanies}
              </div>
              <div className="text-[12px] text-gray-400 mb-4">résultats max</div>
              <input type="range" min={5} max={10000} step={5} value={maxCompanies}
                onChange={e=>setMaxCompanies(Number(e.target.value))} className="w-full accent-indigo-600 mb-3"/>
              <div className="flex gap-1 flex-wrap">
                {SIZES.map(s=>{
                  const v = getSizeValue(s)
                  return (
                    <button key={String(s)} onClick={()=>setMaxCompanies(v)}
                      className={cn('text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all',
                        maxCompanies===v?'bg-indigo-600 text-white border-indigo-600':'border-gray-200 text-gray-500 hover:border-indigo-300')}>
                      {String(s)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cost summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Récapitulatif</div>
              <div className="flex justify-between text-[13px] mb-1.5 pb-1.5 border-b border-gray-100">
                <span className="text-gray-600">🏢 Profil de base</span>
                <span className="font-semibold text-gray-800">+1 cr/biz</span>
              </div>
              {Object.entries(FIELD_GROUPS).filter(([k])=>k!=='basic'&&selectedFields.has(k)).map(([fid,fdef])=>(
                <div key={fid} className="flex justify-between text-[13px] mb-1">
                  <span className="text-gray-600">{fdef.icon} {fdef.label}</span>
                  <span className="font-semibold text-gray-800">+{fdef.cost} cr/biz</span>
                </div>
              ))}
              <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Coût par entreprise</span>
                  <span className="font-bold text-gray-800">{costPerBiz} cr</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Max entreprises</span>
                  <span className="font-bold text-gray-800">×{maxCompanies.toLocaleString('fr-FR')}</span>
                </div>
                <div className="flex justify-between text-[15px] font-bold mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-700">Estimation max</span>
                  <span className={isFreeTrial?'text-emerald-600':'text-indigo-600'}>
                    {isFreeTrial?'🎁 GRATUIT':`${maxEstCost.toLocaleString('fr-FR')} cr`}
                  </span>
                </div>
                {balance!==null&&(
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-gray-400">Votre solde</span>
                    <span className={cn('font-semibold',balance>=maxEstCost||isFreeTrial?'text-emerald-600':'text-red-500')}>
                      {balance.toLocaleString('fr-FR')} cr
                    </span>
                  </div>
                )}
              </div>
              {liveCount!==null&&(
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                  <div className="text-[22px] font-bold text-indigo-700">{liveCount.toLocaleString('fr-FR')}</div>
                  <div className="text-[12px] text-indigo-500">entreprises correspondent</div>
                </div>
              )}
            </div>

            {/* Launch button */}
            <button onClick={handleLaunch} disabled={estimating||launching}
              className={cn('w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[14.5px] transition-all shadow-lg',
                isFreeTrial?'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200':'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200')}>
              {estimating?<><Loader2 className="w-4 h-4 animate-spin"/>Estimation...</>:
               launching?<><Loader2 className="w-4 h-4 animate-spin"/>Lancement...</>:
               isFreeTrial?<>🎁 Obtenir mes 100 entreprises gratuitement</>:
               <>Lancer la recherche →</>}
            </button>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-[12px] text-gray-500 space-y-1.5">
              <div className="font-semibold text-gray-600 mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/>Comment ça marche</div>
              <div className="flex gap-1.5"><span className="text-emerald-500">✓</span> Aperçu gratuit : nom + ville</div>
              <div className="flex gap-1.5"><span className="text-indigo-500">✓</span> 1 cr minimum pour le profil de base (6 champs)</div>
              <div className="flex gap-1.5"><span className="text-indigo-500">✓</span> Coût calculé uniquement si la donnée existe</div>
              <div className="flex gap-1.5"><span className="text-amber-500">✓</span> Données prioritisées : d'abord les entreprises les plus complètes</div>
              <div className="flex gap-1.5"><span className="text-purple-500">✓</span> Déblocage progressif : ajoutez des champs après coup</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
