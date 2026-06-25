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

const FIELD_LABELS: Record<string, string> = {
  phone:'Téléphone', email:'E-mail', website:'Site web', director:'Dirigeant',
  ice:'ICE', annee_creation:'Année création', capital:'Capital social', address:'Adresse',
}

// Capital is stored as TEXT — handle "100 000", "100,000", "100000 MAD", etc.
function formatCapital(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.').replace(/\s/g, ''))
  return isNaN(n) ? val : n.toLocaleString('fr-FR') + ' MAD'
}

// ── Single field cell ──────────────────────────────────────────
function FieldCell({ company, fieldId, onUnlock }: {
  company: Company; fieldId: FieldGroupId
  onUnlock: (id:string, field:string) => Promise<void>
}) {
  const fdef = FIELD_GROUPS[fieldId]
  const cols = fdef?.columns ?? []
  const unlocked = company.unlocked_fields?.includes(fieldId) ?? false
  const [busy, setBusy] = useState(false)
  const Icon = FIELD_ICONS[fieldId] || FileText
  const label = FIELD_LABELS[fieldId] ?? fdef?.label ?? fieldId

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

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0"/>{label}
      </span>
      {unlocked ? (
        value ? (
          <span className="flex items-center gap-1 text-[12.5px]">
            <span className="text-emerald-500 text-[10px] font-bold shrink-0">✓</span>
            {fieldId === 'phone' ? (
              <a href={`tel:${value}`} className="font-mono text-gray-800 hover:text-indigo-600 truncate">{value}</a>
            ) : fieldId === 'email' ? (
              <a href={`mailto:${value}`} className="text-gray-800 hover:text-indigo-600 truncate">{value}</a>
            ) : fieldId === 'website' ? (
              <a href={value} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 truncate">
                {value.replace(/^https?:\/\//,'')}
                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50"/>
              </a>
            ) : fieldId === 'capital' ? (
              <span className="text-gray-800 font-medium">{formatCapital(value)}</span>
            ) : (
              <span className="text-gray-800 truncate">{value}</span>
            )}
          </span>
        ) : (
          <span className="text-[12px] text-gray-300 italic">Non renseigné</span>
        )
      ) : (
        <button
          onClick={handleUnlock}
          disabled={busy || !value}
          className={cn(
            'flex items-center gap-1.5 text-[11.5px] rounded-lg px-2 py-1 border transition-all w-fit mt-0.5',
            !value
              ? 'text-gray-300 border-gray-100 cursor-not-allowed bg-gray-50'
              : 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer font-medium'
          )}
        >
          {busy
            ? <Loader2 className="w-3 h-3 animate-spin shrink-0"/>
            : <Lock className="w-3 h-3 shrink-0"/>}
          {!value
            ? <span className="text-gray-300">Non disponible</span>
            : <span>{fdef?.label} <span className="text-indigo-400 font-normal">({fdef?.cost} cr)</span></span>}
        </button>
      )}
    </div>
  )
}

// ── Company Card — all fields visible, no expand/collapse ─────
function CompanyCard({ company, queryFields, onUnlock, onInjectOne, injectingId, selected, onToggle }: {
  company: Company; queryFields: string[]
  onUnlock: (id:string, field:string) => Promise<void>
  onInjectOne: (id:string) => Promise<void>
  injectingId: string|null
  selected: boolean
  onToggle: (id:string) => void
}) {
  const initials = (n:string) => (n||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
  const uf = company.unlocked_fields ?? []
  const basicUnlocked = uf.includes('basic')
  const isInjecting = injectingId === company.id

  // Row 1: contact essentials
  const ROW1: FieldGroupId[] = ['phone', 'email', 'website', 'director']
  // Row 2: legal / financial data
  const ROW2: FieldGroupId[] = ['ice', 'annee_creation', 'capital', 'address']

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all',
      selected ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-100'
    )}>
      <div className="p-4 sm:p-5">
        {/* ── TOP: avatar + name + actions ── */}
        <div className="flex items-start gap-3 mb-3">
          {/* Checkbox */}
          <button
            onClick={() => onToggle(company.id)}
            className={cn('mt-0.5 shrink-0', selected ? 'text-indigo-600' : 'text-gray-200 hover:text-gray-400')}
          >
            {selected ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[12px] flex items-center justify-center shrink-0">
            {initials(company.name)}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">{company.name}</h3>
                <div className="flex items-center gap-1.5 text-[11.5px] text-gray-400 flex-wrap mt-0.5">
                  {company.city && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 shrink-0"/>{company.city as string}
                    </span>
                  )}
                  {basicUnlocked && company.primary_sector && (
                    <><span className="text-gray-200">·</span><span>{company.primary_sector as string}</span></>
                  )}
                  {basicUnlocked && company.forme_juridique && (
                    <><span className="text-gray-200">·</span>
                    <span className="hidden sm:inline text-gray-400">{company.forme_juridique as string}</span></>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onInjectOne(company.id)}
                  disabled={isInjecting}
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-all"
                >
                  {isInjecting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Users2 className="w-3 h-3"/>}
                  <span className="hidden sm:inline">→ CRM</span>
                </button>
                {basicUnlocked
                  ? <span className="flex items-center gap-1 text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                      <Unlock className="w-2.5 h-2.5"/>Déverr.
                    </span>
                  : <span className="flex items-center gap-1 text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                      <Lock className="w-2.5 h-2.5"/>Partiel
                    </span>
                }
              </div>
            </div>

            {/* Activity tags */}
            {basicUnlocked && Array.isArray(company.activities) && (company.activities as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(company.activities as string[]).slice(0,3).map((a,i) => (
                  <span key={i} className="text-[10.5px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="border-t border-gray-100 mx-1 mb-3"/>

        {/* ── ROW 1: Phone, Email, Website, Director ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {ROW1.map(fid => (
            <FieldCell key={fid} company={company} fieldId={fid} onUnlock={onUnlock}/>
          ))}
        </div>

        {/* ── ROW 2: ICE, Année, Capital, Address ── */}
        <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROW2.map(fid => (
            <FieldCell key={fid} company={company} fieldId={fid} onUnlock={onUnlock}/>
          ))}
        </div>
      </div>
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

  function toggleSelect(companyId:string) {
    setSelected(prev => { const n=new Set(prev); n.has(companyId)?n.delete(companyId):n.add(companyId); return n })
  }

  const { query, companies, fields } = data ?? { query: {}, companies: [], fields: [] }
  const totalPages = Math.ceil(companies.length / PER_PAGE)
  const pagedCompanies = companies.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const allSelected = selected.size === companies.length && companies.length > 0

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin"/></div>
  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Recherche introuvable</div>

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

        {/* Toolbar: bulk select + inject */}
        {companies.length > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex-wrap">
            <button
              onClick={() => {
                if (allSelected) setSelected(new Set())
                else setSelected(new Set(companies.map(c=>c.id)))
              }}
              className="flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-gray-900"
            >
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-4 text-[12.5px] text-gray-400">
            <span>{companies.length.toLocaleString('fr-FR')} entreprises · page {currentPage}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={()=>setCurrentPage(1)} disabled={currentPage===1} className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">«</button>
              <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">‹</button>
              <span className="px-3 py-1 text-gray-600 font-semibold">{currentPage}</span>
              <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">›</button>
              <button onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages} className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">»</button>
            </div>
          </div>
        )}

        {/* Companies list */}
        {companies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-3">Aucune entreprise dans cette recherche.</p>
            <Link href="/search" className="text-indigo-600 font-semibold hover:underline">Nouvelle recherche</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pagedCompanies.map((c, i) => (
              <CompanyCard
                key={c.id ?? i}
                company={c}
                queryFields={fields}
                onUnlock={handleUnlock}
                onInjectOne={handleInjectOne}
                injectingId={injectingId}
                selected={selected.has(c.id)}
                onToggle={toggleSelect}
              />
            ))}
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">
              ← Précédent
            </button>
            <span className="text-[13px] text-gray-500 px-2">{currentPage} / {totalPages}</span>
            <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
