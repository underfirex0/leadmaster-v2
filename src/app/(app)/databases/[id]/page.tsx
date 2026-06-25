'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Download, Users2, Phone, Mail, Globe, User,
  Building2, MapPin, Loader2, Lock, Unlock, ExternalLink,
  Share2, DollarSign, Calendar, FileText, Check, CheckSquare, Square
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

type Company = Record<string, unknown> & {
  id: string; name: string; city: string|null; unlocked_fields?: string[]
}

const FIELD_ICONS: Record<string, React.ElementType> = {
  phone:Phone, email:Mail, address:MapPin, website:Globe,
  director:User, ice:Building2, annee_creation:Calendar,
  capital:DollarSign, social:Share2, legal:FileText,
}

// ── Field value with progressive unlock ──────────────────────
function FieldValue({ company, fieldId, onUnlock }: {
  company: Company; fieldId: FieldGroupId
  onUnlock: (id:string, field:string) => Promise<void>
}) {
  const fdef = FIELD_GROUPS[fieldId]
  const cols = fdef?.columns ?? []
  const unlocked = company.unlocked_fields?.includes(fieldId) ?? false
  const [busy, setBusy] = useState(false)
  const Icon = FIELD_ICONS[fieldId] || FileText

  function getValue(): string|null {
    for (const col of cols) {
      const v = company[col]
      if (v != null && v !== '') return String(v)
    }
    return null
  }
  const value = getValue()

  async function handleUnlock() {
    setBusy(true); await onUnlock(company.id, fieldId); setBusy(false)
  }

  if (unlocked) {
    if (!value) return (
      <div className="flex items-center gap-1.5 text-[12px] text-gray-300">
        <Icon className="w-3 h-3 shrink-0"/><span className="italic">Non renseigné</span>
      </div>
    )
    return (
      <div className="flex items-center gap-1.5 text-[12.5px] text-gray-700">
        <Icon className="w-3 h-3 text-emerald-500 shrink-0"/>
        <span className="text-emerald-600 text-[10px] font-bold mr-0.5">✓</span>
        {fieldId==='phone' ? <a href={`tel:${value}`} className="font-mono hover:text-indigo-600">{value}</a>
        : fieldId==='email' ? <a href={`mailto:${value}`} className="hover:text-indigo-600 truncate max-w-[200px]">{value}</a>
        : fieldId==='website' ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate max-w-[180px]">{value.replace(/^https?:\/\//,'')}<ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-50"/></a>
        : <span className="truncate max-w-[200px]">{value}</span>}
      </div>
    )
  }

  return (
    <button onClick={handleUnlock} disabled={busy||!value}
      className={cn('flex items-center gap-1.5 text-[12px] rounded-lg px-2 py-1 border transition-all',
        !value ? 'text-gray-300 border-gray-100 cursor-not-allowed'
               : 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer font-medium')}>
      {busy ? <Loader2 className="w-3 h-3 animate-spin shrink-0"/> : <Lock className="w-3 h-3 shrink-0"/>}
      {!value ? <span className="text-gray-300">Non disponible</span>
              : <span>{fdef?.label} <span className="text-indigo-400">({fdef?.cost} cr)</span></span>}
    </button>
  )
}

// ── Company Card ─────────────────────────────────────────────
function CompanyCard({ company, queryFields, onUnlock, onInjectOne, injectingId }: {
  company: Company; queryFields: string[]
  onUnlock: (id:string, field:string) => Promise<void>
  onInjectOne: (id:string) => Promise<void>
  injectingId: string|null
}) {
  const [expanded, setExpanded] = useState(false)
  const initials = (n:string) => (n||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
  const uf = company.unlocked_fields ?? []
  const basicUnlocked = uf.includes('basic')

  const MAIN_FIELDS: FieldGroupId[]  = ['phone','email','website','director']
  const EXTRA_FIELDS: FieldGroupId[] = ['ice','annee_creation','capital','address','social']

  const isInjecting = injectingId === company.id

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[12px] flex items-center justify-center shrink-0">
            {initials(company.name)}
          </div>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-bold text-[14.5px] text-gray-900 truncate">{company.name}</h3>
                <div className="flex items-center gap-2 text-[12px] text-gray-400 flex-wrap mt-0.5">
                  {company.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{company.city as string}</span>}
                  {basicUnlocked && company.primary_sector && <span>· {company.primary_sector as string}</span>}
                  {basicUnlocked && company.forme_juridique && <span className="hidden sm:inline">· {company.forme_juridique as string}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Per-company CRM button */}
                <button
                  onClick={() => onInjectOne(company.id)}
                  disabled={isInjecting}
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-all"
                  title="Injecter dans le CRM"
                >
                  {isInjecting
                    ? <Loader2 className="w-3 h-3 animate-spin"/>
                    : <Users2 className="w-3 h-3"/>}
                  <span className="hidden sm:inline">→ CRM</span>
                </button>
                {basicUnlocked
                  ? <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"><Unlock className="w-3 h-3"/>Déverr.</span>
                  : <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><Lock className="w-3 h-3"/>Partiel</span>
                }
              </div>
            </div>

            {/* Activities */}
            {basicUnlocked && Array.isArray(company.activities) && (company.activities as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {(company.activities as string[]).slice(0,3).map((a,i) => (
                  <span key={i} className="text-[10.5px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{a}</span>
                ))}
              </div>
            )}

            {/* Main fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
              {MAIN_FIELDS.map(fid => (
                <FieldValue key={fid} company={company} fieldId={fid} onUnlock={onUnlock}/>
              ))}
            </div>

            <button onClick={() => setExpanded(!expanded)}
              className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium mt-1">
              {expanded ? '▲ Voir moins' : '▼ Données supplémentaires'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXTRA_FIELDS.map(fid => (
              <FieldValue key={fid} company={company} fieldId={fid} onUnlock={onUnlock}/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData]         = useState<{ query: Record<string,unknown>; companies: Company[]; fields: string[] }|null>(null)
  const [loading, setLoading]   = useState(true)
  const [injecting, setInjecting]   = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const PER_PAGE = 50
  const [injectingId, setInjectingId] = useState<string|null>(null)
  const [balance, setBalance]   = useState<number|null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkInj, setBulkInj]   = useState(false)
  const [toast, setToast]       = useState<{msg:string;type:'success'|'error'}|null>(null)

  function showToast(msg:string, type:'success'|'error'='success') {
    setToast({msg,type}); setTimeout(()=>setToast(null), 4000)
  }

  useEffect(() => {
    fetch(`/api/searches/${id}`).then(r=>r.json()).then(d=>{setData(d);setLoading(false)})
    fetch('/api/me/balance').then(r=>r.json()).then(d=>setBalance(d.balance))
  }, [id])

  const handleUnlock = useCallback(async (companyId:string, field:string) => {
    const r = await fetch('/api/unlock/field', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ company_id:companyId, field }),
    })
    const d = await r.json()
    if (!r.ok) { showToast(d.error||'Erreur','error'); return }
    if (d.noData) { showToast('Donnée non disponible','error'); return }
    showToast(`🔓 ${FIELD_GROUPS[field as FieldGroupId]?.label} déverrouillé (-${d.creditsSpent} cr)`)
    setBalance(d.newBalance)
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        companies: prev.companies.map(c => {
          if (c.id !== companyId) return c
          const newUf = [...new Set([...(c.unlocked_fields??[]), field])]
          return { ...c, ...d.data, unlocked_fields: newUf }
        })
      }
    })
  }, [])

  async function injectCompanies(ids: string[]) {
    const r = await fetch('/api/my-data/inject', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ company_ids: ids }),
    })
    const d = await r.json()
    if (!r.ok) { showToast(d.error||'Erreur injection','error'); return }
    showToast(d.message, 'success')
  }

  async function handleInjectOne(companyId: string) {
    setInjectingId(companyId)
    await injectCompanies([companyId])
    setInjectingId(null)
  }

  async function handleInjectSelected() {
    if (!selected.size) return
    setBulkInj(true)
    await injectCompanies([...selected])
    setSelected(new Set())
    setBulkInj(false)
  }

  async function handleInjectAll() {
    if (!data?.companies.length) return
    setInjecting(true)
    await injectCompanies(data.companies.map(c => c.id))
    setInjecting(false)
  }

  async function handleCSV() {
    const r = await fetch(`/api/export?queryId=${id}`)
    if (!r.ok) { showToast('Erreur export','error'); return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`leadmaster-${id.slice(0,8)}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('Export téléchargé ✓')
  }

  function toggleSelect(id:string) {
    setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }
  function selectAll() {
    if (!data) return
    if (selected.size === data.companies.length) setSelected(new Set())
    else setSelected(new Set(data.companies.map(c=>c.id)))
  }

  const { query, companies, fields } = data ?? { query: {}, companies: [], fields: [] }
  const totalPages = Math.ceil(companies.length / PER_PAGE)
  const pagedCompanies = companies.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin"/></div>
  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Recherche introuvable</div>

  const allSelected = selected.size === companies.length && companies.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-[13px] font-semibold text-white max-w-sm',
          toast.type==='success'?'bg-gray-900':'bg-red-500')}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <Link href="/databases" className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600 mb-3">
              <ChevronLeft className="w-4 h-4"/>Mes recherches
            </Link>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-gray-900">
              {companies.length.toLocaleString('fr-FR')} entreprises
            </h1>
            <p className="text-gray-400 text-[13px] mt-0.5">
              Champs : {fields.filter(f=>f!=='basic').map(f=>FIELD_GROUPS[f as FieldGroupId]?.label??f).join(', ')||'Profil de base'}
              {balance!==null && <span className="ml-3 text-indigo-600 font-semibold">◆ {balance.toLocaleString()} cr</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleCSV} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 border border-gray-200 bg-white rounded-xl px-4 py-2.5 hover:bg-gray-50">
              <Download className="w-4 h-4"/>CSV
            </button>
            <button onClick={handleInjectAll} disabled={injecting}
              className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-indigo-600 rounded-xl px-4 py-2.5 hover:bg-indigo-700 shadow-md">
              {injecting?<Loader2 className="w-4 h-4 animate-spin"/>:<Users2 className="w-4 h-4"/>}
              Tout injecter → CRM
            </button>
          </div>
        </div>

        {/* Toolbar: select + bulk inject */}
        {companies.length > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex-wrap">
            <button onClick={selectAll} className="flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-gray-900">
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-indigo-600"/>
                : <Square className="w-4 h-4 text-gray-300"/>}
              {selected.size > 0 ? `${selected.size} sélectionnée${selected.size>1?'s':''}` : 'Tout sélectionner'}
            </button>
            {selected.size > 0 && (
              <>
                <div className="h-4 w-px bg-gray-200"/>
                <button onClick={handleInjectSelected} disabled={bulkInj}
                  className="flex items-center gap-1.5 text-[12.5px] font-bold text-white bg-indigo-600 rounded-xl px-3.5 py-2 hover:bg-indigo-700 shadow-sm">
                  {bulkInj?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Users2 className="w-3.5 h-3.5"/>}
                  Injecter {selected.size} → CRM
                </button>
                <button onClick={()=>setSelected(new Set())} className="text-[12px] text-gray-400 hover:text-gray-600">
                  Désélectionner
                </button>
              </>
            )}
            <span className="ml-auto text-[12px] text-gray-400">{companies.length.toLocaleString('fr-FR')} entreprises</span>
          </div>
        )}

        {/* Progressive unlock note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-[12.5px] text-amber-700 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0"/>
          <span><strong>Déblocage progressif :</strong> Les champs 🔒 peuvent être débloqués individuellement. Utilisez <strong>→ CRM</strong> sur chaque ligne pour injecter une entreprise, ou <strong>Tout injecter</strong> pour envoyer toutes les entreprises en une fois.</span>
        </div>

        {/* Companies list */}
        {companies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-3">Aucune entreprise dans cette recherche.</p>
            <Link href="/search" className="text-indigo-600 font-semibold hover:underline">Nouvelle recherche</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((c, i) => (
              <div key={c.id??i} className="relative">
                {/* Checkbox overlay */}
                <div
                  className={cn('absolute left-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer',
                    selected.has(c.id) ? 'text-indigo-600' : 'text-gray-200 hover:text-gray-400')}
                  onClick={() => toggleSelect(c.id)}
                  style={{ top: '24px', transform: 'none' }}
                >
                  {selected.has(c.id)
                    ? <CheckSquare className="w-4 h-4"/>
                    : <Square className="w-4 h-4"/>}
                </div>
                <div className={cn('ml-7', selected.has(c.id) && 'ring-2 ring-indigo-400 rounded-2xl')}>
                  <CompanyCard
                    company={c}
                    queryFields={fields}
                    onUnlock={handleUnlock}
                    onInjectOne={handleInjectOne}
                    injectingId={injectingId}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
