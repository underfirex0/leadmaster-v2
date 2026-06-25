'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Download, Users2, Phone, Mail, Globe, User,
  Building2, MapPin, Loader2, Lock, Unlock, ExternalLink,
  CheckCircle, Share2, DollarSign, Calendar, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_GROUPS } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

type Company = Record<string, unknown> & {
  id: string; name: string; city: string | null
  unlocked_fields?: string[]
}

const FIELD_ICONS: Record<string, React.ElementType> = {
  phone: Phone, email: Mail, address: MapPin, website: Globe,
  director: User, ice: Building2, annee_creation: Calendar,
  capital: DollarSign, social: Share2, legal: FileText,
}

function FieldValue({ company, fieldId, onUnlock, balance }: {
  company: Company; fieldId: FieldGroupId
  onUnlock: (companyId: string, field: string) => Promise<void>
  balance: number | null
}) {
  const fdef = FIELD_GROUPS[fieldId]
  const cols = fdef?.columns ?? []
  const unlocked = company.unlocked_fields?.includes(fieldId) ?? false
  const [unlocking, setUnlocking] = useState(false)
  const Icon = FIELD_ICONS[fieldId] || FileText

  // Get display value
  function getValue(): string | null {
    for (const col of cols) {
      const v = company[col]
      if (v != null && v !== '') return String(v)
    }
    return null
  }

  const value = getValue()
  const hasData = value !== null

  async function handleUnlock() {
    setUnlocking(true)
    await onUnlock(company.id, fieldId)
    setUnlocking(false)
  }

  if (unlocked && hasData) {
    return (
      <div className="flex items-center gap-1.5 text-[12.5px] text-gray-700">
        <Icon className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="font-medium text-emerald-700 mr-1">✓</span>
        {fieldId === 'phone' ? (
          <a href={`tel:${value}`} className="font-mono hover:text-indigo-600">{value}</a>
        ) : fieldId === 'email' ? (
          <a href={`mailto:${value}`} className="hover:text-indigo-600 truncate max-w-[200px]">{value}</a>
        ) : fieldId === 'website' ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate max-w-[180px]">
            {value.replace(/^https?:\/\//,'')}<ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-50"/>
          </a>
        ) : fieldId === 'address' ? (
          <span className="truncate max-w-[200px]">{value}</span>
        ) : (
          <span>{value}</span>
        )}
      </div>
    )
  }

  if (unlocked && !hasData) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-gray-300">
        <Icon className="w-3 h-3 shrink-0" />
        <span className="italic">Non renseigné</span>
      </div>
    )
  }

  // Locked — show unlock button
  return (
    <button onClick={handleUnlock} disabled={unlocking || !hasData}
      className={cn(
        'flex items-center gap-1.5 text-[12px] rounded-lg px-2 py-1 transition-all border',
        !hasData
          ? 'text-gray-300 border-gray-100 cursor-not-allowed'
          : 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer font-medium'
      )}>
      {unlocking ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
      {!hasData ? (
        <span className="text-gray-300">Non disponible</span>
      ) : (
        <span>{fdef?.label} <span className="text-indigo-400">({fdef?.cost} cr)</span></span>
      )}
    </button>
  )
}

function CompanyCard({ company, queryFields, onUnlock, balance }: {
  company: Company; queryFields: string[]
  onUnlock: (id: string, field: string) => Promise<void>
  balance: number | null
}) {
  const [expanded, setExpanded] = useState(false)
  const initials = (n: string) => (n||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
  const unlockedFields = company.unlocked_fields ?? []

  const basicUnlocked = unlockedFields.includes('basic')

  const MAIN_FIELDS: FieldGroupId[] = ['phone','email','website','director']
  const EXTRA_FIELDS: FieldGroupId[] = ['ice','annee_creation','capital','address','social']
  const ALL_FIELD_IDS = Object.keys(FIELD_GROUPS).filter(k => k !== 'basic') as FieldGroupId[]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[12px] flex items-center justify-center shrink-0">
            {initials(company.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-[14.5px] text-gray-900">{company.name}</h3>
                <div className="flex items-center gap-2 text-[12px] text-gray-400 flex-wrap mt-0.5">
                  {company.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{company.city as string}</span>}
                  {basicUnlocked && company.primary_sector && <span>· {company.primary_sector as string}</span>}
                  {basicUnlocked && company.forme_juridique && <span>· {company.forme_juridique as string}</span>}
                  {basicUnlocked && company.annee_creation && <span className="hidden sm:inline">· {company.annee_creation as string}</span>}
                </div>
              </div>
              {basicUnlocked
                ? <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0"><Unlock className="w-3 h-3"/>Déverr.</span>
                : <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0"><Lock className="w-3 h-3"/>Partiel</span>
              }
            </div>

            {/* Activities */}
            {basicUnlocked && Array.isArray(company.activities) && (company.activities as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {(company.activities as string[]).slice(0,3).map((a,i)=>(
                  <span key={i} className="text-[10.5px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{a}</span>
                ))}
              </div>
            )}

            {/* Main fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {MAIN_FIELDS.map(fid => (
                <FieldValue key={fid} company={company} fieldId={fid} onUnlock={onUnlock} balance={balance} />
              ))}
            </div>

            <button onClick={()=>setExpanded(!expanded)} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium mt-1">
              {expanded ? '▲ Voir moins' : '▼ Données supplémentaires'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: extra fields */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXTRA_FIELDS.map(fid => (
              <FieldValue key={fid} company={company} fieldId={fid} onUnlock={onUnlock} balance={balance} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData]       = useState<{ query: Record<string,unknown>; companies: Company[]; fields: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [injecting, setInjecting] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [toast, setToast]     = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    fetch(`/api/searches/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
    fetch('/api/me/balance').then(r => r.json()).then(d => setBalance(d.balance))
  }, [id])

  const handleUnlock = useCallback(async (companyId: string, field: string) => {
    const r = await fetch('/api/unlock/field', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, field }),
    })
    const d = await r.json()
    if (!r.ok) { showToast(d.error || 'Erreur'); return }
    if (d.noData) { showToast('Donnée non disponible pour cette entreprise'); return }
    showToast(`🔓 ${FIELD_GROUPS[field as FieldGroupId]?.label} déverrouillé (-${d.creditsSpent} cr)`)
    setBalance(d.newBalance)

    // Update company in data
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        companies: prev.companies.map(c => {
          if (c.id !== companyId) return c
          const newUnlocked = [...new Set([...(c.unlocked_fields ?? []), field])]
          // Merge unlocked data
          const fieldData = d.data ?? {}
          return { ...c, ...fieldData, unlocked_fields: newUnlocked }
        })
      }
    })
  }, [])

  async function handleInjectAll() {
    if (!data?.companies.length) return
    setInjecting(true)
    const r = await fetch('/api/my-data/inject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_ids: data.companies.map(c => c.id) }),
    })
    const d = await r.json()
    showToast(d.message || 'Injecté dans le CRM ✓')
    setInjecting(false)
  }

  async function handleCSV() {
    const r = await fetch(`/api/export?queryId=${id}`)
    if (!r.ok) { showToast('Erreur export'); return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leadmaster-${id.slice(0,8)}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('Export téléchargé ✓')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin"/></div>
  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Recherche introuvable</div>

  const { query, companies } = data
  const fields = (query.fields_requested as string[]) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl text-[13px] font-semibold shadow-xl max-w-sm">{toast}</div>}
      <div className="max-w-[1100px] mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/databases" className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600 mb-3">
              <ChevronLeft className="w-4 h-4"/>Mes recherches
            </Link>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-gray-900">{companies.length} entreprises</h1>
            <p className="text-gray-400 text-[13px] mt-0.5">
              Champs : {fields.map(f => FIELD_GROUPS[f as FieldGroupId]?.label ?? f).join(', ')}
              {balance !== null && <span className="ml-3 text-indigo-600 font-semibold">◆ {balance.toLocaleString()} cr</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleCSV} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 border border-gray-200 bg-white rounded-xl px-4 py-2.5 hover:bg-gray-50">
              <Download className="w-4 h-4"/>CSV
            </button>
            <button onClick={handleInjectAll} disabled={injecting}
              className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-indigo-600 rounded-xl px-4 py-2.5 hover:bg-indigo-700 shadow-sm">
              {injecting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Users2 className="w-4 h-4"/>}
              Tout injecter → CRM
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-[12.5px] text-amber-700 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0"/>
          <span><strong>Déblocage progressif :</strong> Les champs verrouillés 🔒 peuvent être débloqués individuellement à tout moment. Les champs sans données sont indiqués.</span>
        </div>

        <div className="space-y-3">
          {companies.map((c, i) => (
            <CompanyCard key={c.id ?? i} company={c} queryFields={fields} onUnlock={handleUnlock} balance={balance} />
          ))}
        </div>
        {companies.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-3">Aucune entreprise dans cette recherche.</p>
            <Link href="/search" className="text-indigo-600 font-semibold hover:underline">Nouvelle recherche</Link>
          </div>
        )}
      </div>
    </div>
  )
}
