'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Phone, Mail, Globe, User, Building2, MapPin, Unlock,
  Download, Search, X, ChevronRight, CheckSquare, Square,
  Loader2, ExternalLink, Instagram, Linkedin, Facebook,
  ArrowRight, Database, Users2
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Company = {
  id: string; name: string; city: string|null; phone_1: string|null; phone_2: string|null
  email: string|null; website: string|null; facebook: string|null; instagram: string|null
  linkedin: string|null; ice: string|null; director: string|null; forme_juridique: string|null
  capital: string|null; annee_creation: string|null; rc: string|null; description: string|null
  activities: string[]|null; primary_sector: string|null; address_raw: string|null
  logo_url: string|null; latitude: number|null; longitude: number|null
  is_unlocked: true; unlocked_at: string; unlocked_fields: string[]
}

function initials(name: string) { return (name||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() }

function CompanyCard({ company, selected, onSelect }: { company: Company; selected: boolean; onSelect: (id: string)=>void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={cn('bg-white rounded-2xl border overflow-hidden transition-all', selected ? 'border-indigo-400 shadow-md' : 'border-gray-100 shadow-sm')}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => onSelect(company.id)} className={cn('mt-0.5 shrink-0', selected ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500')}>
            {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-[12px] flex items-center justify-center shrink-0 border border-emerald-200">
            {initials(company.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-[14.5px] text-gray-900 truncate">{company.name}</h3>
                <div className="flex items-center gap-2 text-[12px] text-gray-400 mt-0.5 flex-wrap">
                  {company.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{company.city}</span>}
                  {company.primary_sector && <span className="hidden sm:inline">· {company.primary_sector}</span>}
                  {company.annee_creation && <span className="hidden sm:inline">· {company.annee_creation}</span>}
                </div>
              </div>
              <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <Unlock className="w-3 h-3" /><span className="hidden sm:inline">Déverr.</span>
              </span>
            </div>

            {/* Activities */}
            {Array.isArray(company.activities) && company.activities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {company.activities.slice(0,3).map((a,i)=>(
                  <span key={i} className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{a}</span>
                ))}
              </div>
            )}

            {/* Core contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
              {company.phone_1 && <a href={`tel:${company.phone_1}`} className="flex items-center gap-1.5 text-[13px] text-gray-700 hover:text-indigo-600 font-mono"><Phone className="w-3 h-3 text-emerald-500 shrink-0"/>{company.phone_1}</a>}
              {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-indigo-600 truncate"><Mail className="w-3 h-3 text-emerald-500 shrink-0"/><span className="truncate">{company.email}</span></a>}
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] text-indigo-600 hover:underline truncate col-span-full sm:col-span-1"><Globe className="w-3 h-3 shrink-0"/><span className="truncate">{company.website.replace(/^https?:\/\//,'')}</span><ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0"/></a>}
              {company.director && <div className="flex items-center gap-1.5 text-[13px] text-gray-700"><User className="w-3 h-3 text-emerald-500 shrink-0"/>{company.director}</div>}
            </div>

            <button onClick={()=>setExpanded(!expanded)} className="mt-3 text-[12px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              {expanded?'Voir moins':'Voir plus'}<ChevronRight className={cn('w-3 h-3 transition-transform',expanded&&'rotate-90')}/>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            {company.ice && <div><span className="text-gray-400 block text-[10.5px] uppercase tracking-wide font-medium mb-0.5">ICE</span><span className="font-mono text-gray-700">{company.ice}</span></div>}
            {company.rc && <div><span className="text-gray-400 block text-[10.5px] uppercase tracking-wide font-medium mb-0.5">RC</span><span className="text-gray-700">{company.rc}</span></div>}
            {company.capital && <div><span className="text-gray-400 block text-[10.5px] uppercase tracking-wide font-medium mb-0.5">Capital</span><span className="text-gray-700">{company.capital}</span></div>}
            {company.forme_juridique && <div><span className="text-gray-400 block text-[10.5px] uppercase tracking-wide font-medium mb-0.5">Forme</span><span className="text-gray-700">{company.forme_juridique}</span></div>}
            {company.address_raw && <div className="col-span-2"><span className="text-gray-400 block text-[10.5px] uppercase tracking-wide font-medium mb-0.5">Adresse</span><span className="text-gray-600">{company.address_raw}</span></div>}
            {company.description && <div className="col-span-2"><span className="text-gray-400 block text-[10.5px] uppercase tracking-wide font-medium mb-0.5">Description</span><p className="text-gray-600 line-clamp-3">{company.description}</p></div>}
          </div>
          {(company.facebook||company.instagram||company.linkedin) && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Réseaux</span>
              {company.facebook  && <a href={company.facebook}  target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600"><Facebook  className="w-4 h-4"/></a>}
              {company.instagram && <a href={company.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600"><Instagram className="w-4 h-4"/></a>}
              {company.linkedin  && <a href={company.linkedin}  target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700"><Linkedin  className="w-4 h-4"/></a>}
            </div>
          )}
          {company.latitude && company.longitude && (
            <a href={`https://maps.google.com/?q=${company.latitude},${company.longitude}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-indigo-600 hover:underline">
              <MapPin className="w-3 h-3"/>Voir sur Google Maps<ExternalLink className="w-2.5 h-2.5 opacity-60"/>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyDataPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage]     = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [injecting, setInjecting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [toast, setToast]   = useState<{msg:string;type:'success'|'error'}|null>(null)

  function showToast(msg:string,type:'success'|'error'='success'){setToast({msg,type});setTimeout(()=>setToast(null),4000)}

  const fetchData = useCallback(async (p:number,reset=false)=>{
    setLoading(true)
    try {
      const params = new URLSearchParams({page:String(p),limit:'30',...(cityFilter&&{city:cityFilter}),...(nameFilter&&{search:nameFilter})})
      const r = await fetch(`/api/my-data?${params}`)
      const d = await r.json()
      if (reset||p===1) setCompanies(d.companies??[])
      else setCompanies(prev=>[...prev,...(d.companies??[])])
      setTotalCount(d.totalCount??0)
      setHasMore(d.hasMore??false)
    } finally { setLoading(false) }
  },[cityFilter,nameFilter])

  useEffect(()=>{fetchData(1,true)},[cityFilter,nameFilter])

  function toggleSelect(id:string){setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
  function selectAll(){setSelected(selected.size===companies.length?new Set():new Set(companies.map(c=>c.id)))}

  async function handleInject(){
    const ids=[...(selected.size>0?selected:new Set(companies.map(c=>c.id)))]
    setInjecting(true)
    try {
      const r=await fetch('/api/my-data/inject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_ids:ids})})
      const d=await r.json()
      if(!r.ok){showToast(d.error||'Erreur','error');return}
      showToast(d.message,'success');setSelected(new Set())
    } catch {showToast('Erreur réseau','error')} finally {setInjecting(false)}
  }

  function exportCSV(){
    setExporting(true)
    const rows=selected.size>0?companies.filter(c=>selected.has(c.id)):companies
    const headers=['Nom','Ville','Téléphone','Email','Site web','Dirigeant','ICE','Secteur','Adresse']
    const csvRows=rows.map(c=>[c.name,c.city??'',c.phone_1??'',c.email??'',c.website??'',c.director??'',c.ice??'',c.primary_sector??'',c.address_raw??''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))
    const csv='\uFEFF'+[headers.join(','),...csvRows].join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download=`leadmaster-mydata-${Date.now()}.csv`;a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    showToast(`${rows.length} entreprises exportées`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast&&<div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-[13px] font-semibold text-white max-w-sm',toast.type==='success'?'bg-emerald-600':'bg-red-500')}>{toast.msg}</div>}
      <div className="max-w-[1100px] mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-gray-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center"><Unlock className="w-4 h-4 text-emerald-600"/></div>
              Mes Données
            </h1>
            <p className="text-gray-400 text-[13px] mt-1">{loading?'…':`${totalCount.toLocaleString('fr-FR')} entreprise${totalCount!==1?'s':''} déverrouillée${totalCount!==1?'s':''}`}</p>
          </div>
          <Link href="/search" className="flex items-center gap-2 text-[13px] font-semibold text-indigo-600 border border-indigo-200 rounded-xl px-3.5 py-2 hover:bg-indigo-50 self-start">
            <Search className="w-3.5 h-3.5"/>Nouvelle recherche
          </Link>
        </div>

        {!loading && totalCount===0 && !nameFilter && !cityFilter ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 sm:p-14 text-center">
            <Database className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
            <h3 className="font-bold text-gray-700 text-[17px] mb-2">Aucune donnée déverrouillée</h3>
            <p className="text-gray-400 text-[13.5px] mb-6 max-w-md mx-auto">Recherchez des entreprises et déverrouillez leurs coordonnées pour les retrouver ici.</p>
            <Link href="/search" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] hover:bg-indigo-700">
              Commencer la prospection<ArrowRight className="w-4 h-4"/>
            </Link>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                <input value={nameFilter} onChange={e=>setNameFilter(e.target.value)}
                  placeholder="Rechercher dans mes données..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400"/>
                {nameFilter&&<button onClick={()=>setNameFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400"/></button>}
              </div>
              <input value={cityFilter} onChange={e=>setCityFilter(e.target.value)}
                placeholder="Ville..."
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] w-full sm:w-36 focus:outline-none focus:border-indigo-400"/>
              <div className="flex gap-2">
                <button onClick={selectAll} className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 shrink-0">
                  {selected.size===companies.length&&companies.length>0?<CheckSquare className="w-3.5 h-3.5 text-indigo-600"/>:<Square className="w-3.5 h-3.5 text-gray-400"/>}
                  <span className="hidden sm:inline">{selected.size>0?`${selected.size} sél.`:'Tout'}</span>
                </button>
                <button onClick={exportCSV} disabled={exporting}
                  className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 shrink-0">
                  <Download className="w-3.5 h-3.5"/><span className="hidden sm:inline">CSV</span>
                </button>
                <button onClick={handleInject} disabled={injecting}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-3 py-2.5 text-[12.5px] font-bold hover:bg-indigo-700 shadow-sm shrink-0">
                  {injecting?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Users2 className="w-3.5 h-3.5"/>}
                  <span className="hidden sm:inline">{selected.size>0?`${selected.size} →`:'Tout →'}</span>
                  <span className="sm:hidden">CRM</span>
                  <span className="hidden sm:inline">CRM</span>
                </button>
              </div>
            </div>

            {/* List */}
            {loading&&companies.length===0 ? (
              <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse"/>)}</div>
            ) : companies.length===0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <p className="text-gray-400">Aucun résultat pour ces filtres.</p>
                <button onClick={()=>{setNameFilter('');setCityFilter('')}} className="mt-3 text-[13px] text-indigo-600 font-semibold hover:underline">Effacer les filtres</button>
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map(c=><CompanyCard key={c.id} company={c} selected={selected.has(c.id)} onSelect={toggleSelect}/>)}
              </div>
            )}

            {hasMore&&(
              <div className="text-center mt-6">
                <button onClick={()=>{const next=page+1;setPage(next);fetchData(next)}} disabled={loading}
                  className="px-8 py-2.5 border border-gray-200 bg-white rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
                  {loading?<Loader2 className="w-4 h-4 animate-spin mx-auto"/>:'Charger plus'}
                </button>
                <p className="text-[12px] text-gray-400 mt-2">{companies.length}/{totalCount.toLocaleString('fr-FR')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
