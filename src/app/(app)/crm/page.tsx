'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Phone, Mail, Globe, User, MapPin, ChevronDown, ChevronUp,
  Search, Loader2, Trash2, RefreshCw, X, Users2, ArrowRight,
  Lock, Building2, Calendar, DollarSign, Star, TrendingUp,
  MessageSquare, Check, AlertTriangle, RefreshCcw, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { FIELD_GROUPS, EFFECTIF_TRANCHES } from '@/lib/constants'
import type { FieldGroupId } from '@/lib/constants'

type Status = 'to_call'|'in_progress'|'callback'|'interested'|'not_interested'|'converted'|'archived'

const STATUS_CFG: Record<Status, { label:string; color:string; bg:string; border:string; dot:string }> = {
  to_call:        { label:'À appeler',     color:'text-blue-700',    bg:'bg-blue-50',     border:'border-blue-200',   dot:'bg-blue-500'    },
  in_progress:    { label:'En cours',      color:'text-purple-700',  bg:'bg-purple-50',   border:'border-purple-200', dot:'bg-purple-500'  },
  callback:       { label:'À rappeler',    color:'text-orange-700',  bg:'bg-orange-50',   border:'border-orange-200', dot:'bg-orange-500'  },
  interested:     { label:'Intéressé',     color:'text-green-700',   bg:'bg-green-50',    border:'border-green-200',  dot:'bg-green-500'   },
  not_interested: { label:'Pas intéressé', color:'text-red-700',     bg:'bg-red-50',      border:'border-red-200',    dot:'bg-red-500'     },
  converted:      { label:'Converti ✓',   color:'text-emerald-700', bg:'bg-emerald-50',  border:'border-emerald-200',dot:'bg-emerald-500' },
  archived:       { label:'Archivé',       color:'text-gray-500',    bg:'bg-gray-100',    border:'border-gray-200',   dot:'bg-gray-400'    },
}
const ALL_STATUSES = Object.keys(STATUS_CFG) as Status[]

type Lead = {
  id:string; status:Status; priority:string; notes:string|null; callback_date:string|null
  created_at:string; updated_at:string; company_id:string|null
  display_name:string; display_city:string|null; display_sector:string|null
  display_phone:string|null; display_email:string|null; display_website:string|null
  display_director:string|null; display_ice:string|null; display_address:string|null
  display_capital:string|null; display_annee:string|null; display_activities:string[]|null
  unlocked_fields:string[]
  field_availability:Record<string,boolean>
  richness:number
  refund_status?: 'pending'|'approved'|'rejected'|null
  extra_fields?: { key:string; label:string; value:string }[]
  _filter_effectif?: string | null
  _filter_capital?: string | null
}

// Capital tranches — same buckets as the Recherche page, for consistent filtering
const CAPITAL_TRANCHES: { val: string; label: string; min: number; max: number | null }[] = [
  { val:'0-100000',          label:'Moins de 100 000 MAD', min:0,        max:100000 },
  { val:'100000-500000',      label:'100 000 — 500 000 MAD', min:100000,  max:500000 },
  { val:'500000-1000000',     label:'500 000 — 1M MAD',      min:500000,  max:1000000 },
  { val:'1000000-5000000',    label:'1M — 5M MAD',           min:1000000, max:5000000 },
  { val:'5000000-10000000',   label:'5M — 10M MAD',          min:5000000, max:10000000 },
  { val:'10000000-50000000',  label:'10M — 50M MAD',         min:10000000,max:50000000 },
  { val:'50000000-',          label:'Plus de 50M MAD',       min:50000000,max:null },
]

function parseCapitalValue(val: unknown): number {
  if (!val) return NaN
  const n = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.').replace(/\s/g, ''))
  return isNaN(n) ? NaN : n
}

function timeAgo(d:string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// Capital is stored as TEXT — "100 000", "100,000 MAD", etc.
function formatCapital(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.').replace(/\s/g, ''))
  return isNaN(n) ? val : n.toLocaleString('fr-FR') + ' MAD'
}
function initials(n:string) {
  return (n||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
}
function totalAvailable(lead:Lead) {
  const fields = ['phone','email','website','director','ice','annee_creation','effectif','capital','address']
  return fields.filter(f => lead.unlocked_fields.includes(f) || lead.field_availability[f]).length
}
function totalUnlocked(lead:Lead) {
  const fields = ['phone','email','website','director','ice','annee_creation','effectif','capital','address']
  return fields.filter(f => lead.unlocked_fields.includes(f)).length
}

// ── Status Dropdown ───────────────────────────────────────────
function StatusDropdown({ status, onUpdate }: { status:Status; onUpdate:(s:Status)=>void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CFG[status]

  useEffect(() => {
    if (!open) return
    const fn = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap',
          cfg.bg, cfg.color, cfg.border)}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)}/>
        {cfg.label}
        <ChevronDown className="w-3 h-3"/>
      </button>
      {open && (
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden py-1"
          style={{
            top:  ref.current ? ref.current.getBoundingClientRect().bottom + 6 : 0,
            left: ref.current ? Math.min(ref.current.getBoundingClientRect().left, window.innerWidth - 185) : 0,
            minWidth: 175,
          }}
        >
          {ALL_STATUSES.map(s => {
            const sc = STATUS_CFG[s]
            return (
              <button key={s}
                onClick={e => { e.stopPropagation(); onUpdate(s); setOpen(false) }}
                className={cn('w-full text-left px-4 py-2.5 text-[12.5px] font-medium flex items-center gap-2.5 transition-colors hover:bg-gray-50',
                  s === status && 'bg-gray-50 font-bold')}>
                <span className={cn('w-2 h-2 rounded-full shrink-0', sc.dot)}/>
                {sc.label}
                {s === status && <Check className="w-3 h-3 ml-auto text-gray-400"/>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Inline field row (value OR unlock button) ─────────────────
type UnlockFn = (leadId:string, companyId:string, field:string) => Promise<void>

function FieldRow({ lead, field, label, icon: Icon, value, onUnlock }: {
  lead:Lead; field:string; label:string; icon:React.ElementType
  value:string|null|undefined; onUnlock:UnlockFn
}) {
  const [busy, setBusy] = useState(false)
  const isUnlocked  = lead.unlocked_fields.includes(field)
  const isAvailable = lead.field_availability[field]

  async function handleUnlock() {
    if (!lead.company_id) return
    setBusy(true)
    await onUnlock(lead.id, lead.company_id, field)
    setBusy(false)
  }

  if (value) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0"/>
        {field === 'phone'    ? <a href={`tel:${value}`}    className="text-[12.5px] font-mono text-gray-800 hover:text-indigo-600 truncate">{value}</a>
        : field === 'email'   ? <a href={`mailto:${value}`} className="text-[12.5px] text-gray-700 hover:text-indigo-600 truncate">{value}</a>
        : field === 'website' ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-indigo-600 hover:underline truncate">{value.replace(/^https?:\/\//,'')}</a>
        : field === 'capital' ? <span className="text-[12.5px] text-gray-700">{formatCapital(value)}</span>
        :                       <span className="text-[12.5px] text-gray-700 truncate">{value}</span>}
      </div>
    )
  }

  if (lead.company_id && isAvailable && !isUnlocked) {
    const cost = FIELD_GROUPS[field as FieldGroupId]?.cost ?? 1
    return (
      <button onClick={handleUnlock} disabled={busy}
        className="flex items-center gap-1.5 text-[11.5px] font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2 py-1 transition-all whitespace-nowrap">
        {busy ? <Loader2 className="w-3 h-3 animate-spin shrink-0"/> : <Lock className="w-3 h-3 shrink-0"/>}
        {label} <span className="text-indigo-400 font-normal">({cost} cr)</span>
      </button>
    )
  }
  return null
}


// ── Signaler Modal ────────────────────────────────────────────
const REASONS = [
  { value: 'closed',          label: '🚫 Entreprise fermée' },
  { value: 'wrong_number',    label: '📵 Numéro incorrect / inexistant' },
  { value: 'wrong_director',  label: '👤 Dirigeant incorrect' },
  { value: 'wrong_address',   label: '🏠 Adresse incorrecte' },
  { value: 'not_exist',       label: '❌ Entreprise n\'existe pas' },
  { value: 'other',           label: '💬 Autre' },
]

function SignalerModal({ lead, onClose, onSuccess }: {
  lead: Lead
  onClose: () => void
  onSuccess: (leadId: string) => void
}) {
  const [reason, setReason]   = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)

  async function handleSubmit() {
    if (!reason) { setError('Choisissez une raison'); return }
    setLoading(true); setError(null)
    const r = await fetch('/api/refund-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id:      lead.id,
        company_id:   lead.company_id,
        company_name: lead.display_name,
        reason, note,
      }),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Erreur'); setLoading(false); return }
    onSuccess(lead.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-[16px] text-gray-900">Signaler un problème</h2>
            <p className="text-[12.5px] text-gray-400 mt-0.5">{lead.display_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400"/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Raison du signalement</label>
            <div className="space-y-2">
              {REASONS.map(r => (
                <button key={r.value} onClick={() => setReason(r.value)}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-all',
                    reason === r.value
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Note (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Précisez le problème..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl p-3 text-[13px] text-gray-700 resize-none focus:outline-none focus:border-red-300"/>
          </div>

          {error && <p className="text-[12.5px] text-red-500 font-medium">{error}</p>}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[12px] text-amber-700 font-medium">
              💡 Le lead sera archivé et votre demande de remboursement sera examinée sous 48h.
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || !reason}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <AlertTriangle className="w-4 h-4"/>}
            Envoyer le signalement
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Callback Modal — date + note, shown the instant "À rappeler" is chosen ──
function CallbackModal({ lead, onClose, onSuccess }: {
  lead: Lead
  onClose: () => void
  onSuccess: (leadId: string, data: Record<string, unknown>) => void
}) {
  // Default to tomorrow 09:00 so the field is never blank on open
  const defaultDate = (() => {
    const d = lead.callback_date ? new Date(lead.callback_date) : new Date(Date.now() + 24*60*60*1000)
    if (!lead.callback_date) d.setHours(9, 0, 0, 0)
    const pad = (n:number) => String(n).padStart(2,'0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })()

  const [date, setDate]       = useState(defaultDate)
  const [note, setNote]       = useState(lead.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)

  // Quick-pick shortcuts — the most common callback delays
  const quickPicks = [
    { label: 'Demain 9h',      hours: 24 },
    { label: 'Dans 3 jours',   hours: 72 },
    { label: 'Dans 1 semaine', hours: 168 },
  ]
  function applyQuickPick(hours: number) {
    const d = new Date(Date.now() + hours*60*60*1000)
    if (hours === 24) d.setHours(9, 0, 0, 0)
    const pad = (n:number) => String(n).padStart(2,'0')
    setDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
  }

  async function handleSubmit() {
    if (!date) { setError('Choisissez une date de rappel'); return }
    setLoading(true); setError(null)
    const r = await fetch(`/api/crm/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'callback', callback_date: date, notes: note }),
    })
    if (!r.ok) { const d = await r.json().catch(()=>({})); setError(d.error || 'Erreur'); setLoading(false); return }
    onSuccess(lead.id, { status: 'callback', callback_date: date, notes: note })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-[16px] text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> Planifier un rappel
            </h2>
            <p className="text-[12.5px] text-gray-400 mt-0.5">{lead.display_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400"/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick picks */}
          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Rappel rapide</label>
            <div className="grid grid-cols-3 gap-2">
              {quickPicks.map(q => (
                <button key={q.label} onClick={() => applyQuickPick(q.hours)}
                  className="text-[12px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl py-2 hover:bg-orange-100 transition-colors">
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/time picker */}
          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Date et heure du rappel</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-gray-700 focus:outline-none focus:border-orange-300 bg-white"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Note (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Contexte pour le prochain appel..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 text-[13px] text-gray-700 resize-none focus:outline-none focus:border-orange-300 placeholder-gray-300"/>
          </div>

          {error && <p className="text-[12.5px] text-red-500 font-medium">{error}</p>}
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || !date}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-[13px] font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Calendar className="w-4 h-4"/>}
            Planifier le rappel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lead Card ─────────────────────────────────────────────────
function LeadCard({ lead, onUpdate, onDelete, onUnlock }: {
  lead:Lead; onUpdate:(id:string,d:Record<string,unknown>)=>void
  onDelete:(id:string)=>void; onUnlock:UnlockFn
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [notes,      setNotes]      = useState(lead.notes ?? '')
  const [showSignal, setShowSignal] = useState(false)
  const [showCallback, setShowCallback] = useState(false)
  const cfg   = STATUS_CFG[lead.status]
  const avail = totalAvailable(lead)
  const unlkd = totalUnlocked(lead)

  async function updateStatus(status:Status) {
    // "À rappeler" needs a date — open the popup instead of silently
    // switching status with no callback_date set
    if (status === 'callback') { setShowCallback(true); return }
    setSaving(true)
    await fetch(`/api/crm/leads/${lead.id}`,{ method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status}) })
    onUpdate(lead.id,{status})
    setSaving(false)
  }
  async function saveNotes() {
    if (notes === lead.notes) return
    await fetch(`/api/crm/leads/${lead.id}`,{ method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes}) })
    onUpdate(lead.id,{notes})
  }
  async function del() {
    if (!confirm('Supprimer ce lead ?')) return
    await fetch(`/api/crm/leads/${lead.id}`,{ method:'DELETE' })
    onDelete(lead.id)
  }

  const hasRow2 = lead.display_ice || lead.display_annee || lead.display_effectif || lead.display_capital || lead.display_address ||
    (lead.company_id && (lead.field_availability.ice || lead.field_availability.annee_creation || lead.field_availability.effectif || lead.field_availability.capital || lead.field_availability.address))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl font-bold text-[12px] flex items-center justify-center shrink-0',cfg.bg,cfg.color)}>
            {initials(lead.display_name)}
          </div>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-bold text-[14.5px] text-gray-900 leading-tight truncate">{lead.display_name}</h3>
                <div className="flex items-center gap-2 text-[11.5px] text-gray-400 flex-wrap mt-0.5">
                  {lead.display_city   && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/>{lead.display_city}</span>}
                  {lead.display_sector && <><span className="text-gray-200">·</span><span className="truncate max-w-[140px]">{lead.display_sector}</span></>}
                  <span className="text-gray-200">·</span>
                  <span>{timeAgo(lead.updated_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {saving && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin"/>}
                {lead.refund_status === 'pending' && (
                  <span className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                    <RefreshCcw className="w-2.5 h-2.5"/>Remboursement en cours
                  </span>
                )}
                {lead.refund_status !== 'pending' && (
                  <StatusDropdown status={lead.status} onUpdate={updateStatus}/>
                )}
                {!lead.refund_status && (
                  <button onClick={() => setShowSignal(true)}
                    className="p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Signaler un problème">
                    <AlertTriangle className="w-3.5 h-3.5"/>
                  </button>
                )}
                <button onClick={del} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>

            {/* Fields - Row 1: contact */}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <FieldRow lead={lead} field="phone"    label="Téléphone" icon={Phone}  value={lead.display_phone}    onUnlock={onUnlock}/>
              <FieldRow lead={lead} field="email"    label="E-mail"    icon={Mail}   value={lead.display_email}    onUnlock={onUnlock}/>
              <FieldRow lead={lead} field="website"  label="Site web"  icon={Globe}  value={lead.display_website}  onUnlock={onUnlock}/>
              <FieldRow lead={lead} field="director" label="Dirigeant" icon={User}   value={lead.display_director} onUnlock={onUnlock}/>
            </div>

            {/* Fields - Row 2: legal/financial (only if something to show) */}
            {hasRow2 && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-gray-50">
                <FieldRow lead={lead} field="ice"            label="ICE"          icon={Building2} value={lead.display_ice}     onUnlock={onUnlock}/>
                <FieldRow lead={lead} field="annee_creation" label="Année créat." icon={Calendar}  value={lead.display_annee}   onUnlock={onUnlock}/>
                <FieldRow lead={lead} field="effectif"       label="Effectif"     icon={Users2}    value={lead.display_effectif} onUnlock={onUnlock}/>
                <FieldRow lead={lead} field="capital"        label="Capital"      icon={DollarSign}value={lead.display_capital} onUnlock={onUnlock}/>
                <FieldRow lead={lead} field="address"        label="Adresse"      icon={MapPin}    value={lead.display_address} onUnlock={onUnlock}/>
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {lead.display_phone && (
                <a href={`tel:${lead.display_phone}`}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-indigo-600 rounded-xl px-3.5 py-1.5 hover:bg-indigo-700 shadow-sm transition-colors">
                  <Phone className="w-3.5 h-3.5"/>Appeler
                </a>
              )}
              {lead.company_id && avail > 0 && (
                <span className={cn('flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 border',
                  unlkd >= avail ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : unlkd > 0    ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  :                'text-gray-500 bg-gray-50 border-gray-200')}>
                  <Star className="w-2.5 h-2.5"/>
                  {unlkd}/{avail} champ{avail > 1 ? 's' : ''}
                </span>
              )}
              <button onClick={() => setExpanded(!expanded)}
                className="ml-auto flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />Notes
                {expanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSignal && (
        <SignalerModal
          lead={lead}
          onClose={() => setShowSignal(false)}
          onSuccess={leadId => { onUpdate(leadId, { refund_status: 'pending', status: 'archived' }); setShowSignal(false) }}
        />
      )}

      {showCallback && (
        <CallbackModal
          lead={lead}
          onClose={() => setShowCallback(false)}
          onSuccess={(leadId, data) => { onUpdate(leadId, data); setNotes((data.notes as string) ?? notes) }}
        />
      )}

      {/* Notes panel */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/60 space-y-3">
          {(lead.extra_fields?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">
                <FileText className="w-3 h-3" />Champs supplémentaires
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
                {lead.extra_fields!.map(f => (
                  <div key={f.key} className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</div>
                    <div className="text-[12.5px] text-gray-700 whitespace-pre-line break-words">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
            rows={3} placeholder="Ajouter une note sur ce lead..."
            className="w-full border border-gray-200 rounded-xl p-3 text-[13px] text-gray-700 resize-none focus:outline-none focus:border-indigo-300 bg-white placeholder-gray-300"
          />
          {lead.status === 'callback' && (
            <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div>
                <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wide mb-0.5">Rappel planifié</p>
                <p className="text-[13px] font-semibold text-orange-800">
                  {lead.callback_date
                    ? new Date(lead.callback_date).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
                    : 'Aucune date'}
                </p>
              </div>
              <button onClick={() => setShowCallback(true)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-orange-700 bg-white border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-100 transition-colors">
                <Calendar className="w-3.5 h-3.5" /> Modifier
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main CRM Page ─────────────────────────────────────────────
export default function CRMPage() {
  const [leads,   setLeads]   = useState<Lead[]>([])
  const [counts,  setCounts]  = useState<Record<string,number>>({})
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Status|'all'>('all')
  const [search,  setSearch]  = useState('')
  const [toast,   setToast]   = useState<{msg:string;type:'success'|'error'}|null>(null)
  const [balance, setBalance] = useState<number|null>(null)
  const PER_PAGE = 50
  const [page, setPage] = useState(1)

  // Extra filters
  const [cityFilter,     setCityFilter]     = useState('')
  const [sectorFilter,   setSectorFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [effectifFilters, setEffectifFilters] = useState<string[]>([])
  const [capitalFilters,  setCapitalFilters]  = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  function showToast(msg:string, type:'success'|'error'='success') {
    setToast({msg,type}); setTimeout(()=>setToast(null),3500)
  }

  const fetchLeads = useCallback(async (status?:string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (search) params.set('q', search)
    const r = await fetch(`/api/crm/leads?${params}`)
    const d = await r.json()
    setLeads(d.leads ?? [])
    setCounts(d.counts ?? {})
    setLoading(false)
    setPage(1)
  }, [search])

  useEffect(() => { fetchLeads(tab === 'all' ? undefined : tab) }, [tab, fetchLeads])
  useEffect(() => { fetch('/api/me/balance').then(r=>r.json()).then(d=>setBalance(d.balance)) }, [])

  function updateLead(id:string, data:Record<string,unknown>) {
    setLeads(prev => prev.map(l => l.id === id ? {...l,...data} as Lead : l))
    if (data.status) {
      setCounts(prev => {
        const lead = leads.find(l => l.id === id)
        if (!lead) return prev
        const n = {...prev}
        n[lead.status] = Math.max(0,(n[lead.status]||0)-1)
        n[data.status as string] = (n[data.status as string]||0)+1
        return n
      })
    }
  }

  function removeLead(id:string) {
    const lead = leads.find(l => l.id === id)
    setLeads(prev => prev.filter(l => l.id !== id))
    if (lead) setCounts(prev => ({...prev,[lead.status]:Math.max(0,(prev[lead.status]||0)-1)}))
    showToast('Lead supprimé')
  }

  const handleUnlock = useCallback(async (leadId:string, companyId:string, field:string) => {
    const r = await fetch('/api/unlock/field',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({company_id:companyId,field}),
    })
    const d = await r.json()
    if (!r.ok) { showToast(d.error||'Erreur','error'); return }
    if (d.noData) { showToast('Donnée non disponible','error'); return }
    if (d.newBalance !== undefined) setBalance(d.newBalance)
    showToast(`🔓 ${FIELD_GROUPS[field as FieldGroupId]?.label} déverrouillé (-${d.creditsSpent} cr)`)

    const fieldToDisplay: Record<string,string> = {
      phone:'display_phone', email:'display_email', website:'display_website',
      director:'display_director', ice:'display_ice', annee_creation:'display_annee',
      capital:'display_capital', address:'display_address',
    }
    const fieldToData: Record<string,string> = {
      phone:'phone_1',email:'email',website:'website',director:'director',
      ice:'ice',annee_creation:'annee_creation',effectif:'effectif',capital:'capital',address:'address_raw',
    }
    const displayKey = fieldToDisplay[field]
    const newValue   = d.data?.[fieldToData[field]] ?? null

    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l
      return { ...l, unlocked_fields:[...new Set([...l.unlocked_fields,field])], [displayKey]:newValue } as Lead
    }))
  }, [])

  const total = Object.values(counts).reduce((s,n)=>s+n,0)
  const TABS = [
    {key:'all',         label:'Tous',       cnt:total},
    {key:'to_call',     label:'À appeler',  cnt:counts.to_call||0},
    {key:'in_progress', label:'En cours',   cnt:counts.in_progress||0},
    {key:'callback',    label:'À rappeler', cnt:counts.callback||0},
    {key:'interested',  label:'Intéressé',  cnt:counts.interested||0},
    {key:'converted',   label:'Converti',   cnt:counts.converted||0},
    {key:'archived',    label:'Archivé',    cnt:counts.archived||0},
  ]
  // Collect unique cities and sectors from loaded leads for filter dropdowns
  const crmCities   = [...new Set(leads.map(l => l.city).filter(Boolean))].sort()
  const crmSectors  = [...new Set(leads.map(l => l.sector).filter(Boolean))].sort()

  const filteredLeads = leads.filter(l => {
    if (cityFilter     && l.city   !== cityFilter)     return false
    if (sectorFilter   && l.sector !== sectorFilter)   return false
    if (priorityFilter && l.priority !== priorityFilter) return false
    if (effectifFilters.length > 0 && !effectifFilters.includes(l._filter_effectif ?? '')) return false
    if (capitalFilters.length > 0) {
      const cap = parseCapitalValue(l._filter_capital)
      if (isNaN(cap)) return false
      const inAnyTranche = capitalFilters.some(fval => {
        const t = CAPITAL_TRANCHES.find(ct => ct.val === fval)
        if (!t) return false
        return cap >= t.min && (t.max === null || cap < t.max)
      })
      if (!inAnyTranche) return false
    }
    return true
  })
  const totalPages = Math.ceil(filteredLeads.length / PER_PAGE)
  const pagedLeads = filteredLeads.slice((page-1)*PER_PAGE, page*PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-[13px] font-semibold text-white shadow-xl max-w-sm',
          toast.type==='error'?'bg-red-500':'bg-gray-900')}>{toast.msg}</div>
      )}

      <div className="max-w-[980px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 flex items-center gap-3">
              <Users2 className="w-7 h-7 text-indigo-600"/>CRM — Suivi des leads
            </h1>
            <p className="text-[13.5px] text-gray-400 mt-0.5">
              <span className="font-semibold text-gray-700">{total.toLocaleString('fr-FR')}</span> lead{total!==1?'s':''} au total
              {balance!==null && <span className="ml-3 text-indigo-600 font-semibold">◆ {balance.toLocaleString('fr-FR')} cr</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/databases" className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 border border-indigo-200 rounded-xl px-3 py-2 hover:bg-indigo-50 transition-colors">
              <ArrowRight className="w-3.5 h-3.5 rotate-180"/>Mes données
            </Link>
            <button onClick={()=>fetchLeads(tab==='all'?undefined:tab)}
              className="flex items-center gap-1.5 text-[13px] text-gray-500 border border-gray-200 bg-white rounded-xl px-3 py-2 hover:bg-gray-50">
              <RefreshCw className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {label:'À appeler',  val:counts.to_call||0,    color:'text-blue-600'},
            {label:'À rappeler', val:counts.callback||0,   color:'text-orange-600'},
            {label:'Intéressé',  val:counts.interested||0, color:'text-green-600'},
            {label:'Converti',   val:counts.converted||0,  color:'text-emerald-600'},
          ].map((s,i)=>(
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className={cn('text-[28px] font-bold font-mono tabular-nums',s.color)}>{s.val.toLocaleString('fr-FR')}</div>
              <div className="text-[11.5px] text-gray-400 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5">
          <div className="flex overflow-x-auto border-b border-gray-100">
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key as Status|'all')}
                className={cn('flex items-center gap-1.5 px-3 sm:px-4 py-3 text-[12.5px] sm:text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors shrink-0',
                  tab===t.key?'border-indigo-500 text-indigo-600 bg-indigo-50/60':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
                {t.label}
                {t.cnt>0&&<span className={cn('text-[10.5px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  tab===t.key?'bg-indigo-600 text-white':'bg-gray-100 text-gray-500')}>{t.cnt.toLocaleString('fr-FR')}</span>}
              </button>
            ))}
          </div>
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Rechercher par nom, ville, secteur..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-[13px] focus:outline-none focus:border-indigo-300 bg-gray-50/50"/>
              {search&&<button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400"/></button>}
            </div>
            {/* Filter row */}
            <div className="flex flex-wrap gap-2">
              {crmCities.length > 0 && (
                <select value={cityFilter} onChange={e=>{setCityFilter(e.target.value);setPage(1)}}
                  className={`border rounded-xl px-3 py-1.5 text-[12.5px] focus:outline-none bg-white transition-colors ${cityFilter ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-500'}`}>
                  <option value="">Toutes les villes</option>
                  {crmCities.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {crmSectors.length > 0 && (
                <select value={sectorFilter} onChange={e=>{setSectorFilter(e.target.value);setPage(1)}}
                  className={`border rounded-xl px-3 py-1.5 text-[12.5px] focus:outline-none bg-white transition-colors max-w-[180px] ${sectorFilter ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-500'}`}>
                  <option value="">Tous les secteurs</option>
                  {crmSectors.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <select value={priorityFilter} onChange={e=>{setPriorityFilter(e.target.value);setPage(1)}}
                className={`border rounded-xl px-3 py-1.5 text-[12.5px] focus:outline-none bg-white transition-colors ${priorityFilter ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-500'}`}>
                <option value="">Toutes priorités</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 Haute</option>
                <option value="normal">⚪ Normale</option>
                <option value="low">🔵 Basse</option>
              </select>
              <button onClick={()=>setFiltersOpen(o=>!o)}
                className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition-colors ${(effectifFilters.length>0||capitalFilters.length>0) ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                Effectif / Capital
                {(effectifFilters.length+capitalFilters.length)>0 && (
                  <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center">{effectifFilters.length+capitalFilters.length}</span>
                )}
                <ChevronDown className={cn('w-3 h-3 transition-transform', filtersOpen && 'rotate-180')} />
              </button>
              {(cityFilter||sectorFilter||priorityFilter||effectifFilters.length>0||capitalFilters.length>0) && (
                <button onClick={()=>{setCityFilter('');setSectorFilter('');setPriorityFilter('');setEffectifFilters([]);setCapitalFilters([]);setPage(1)}}
                  className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-3 h-3"/> Réinitialiser
                </button>
              )}
              {filteredLeads.length !== leads.length && (
                <span className="text-[11.5px] text-indigo-600 font-medium self-center ml-auto">
                  {filteredLeads.length} / {leads.length} leads
                </span>
              )}
            </div>

            {/* Effectif / Capital panel */}
            {filtersOpen && (
              <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11.5px] font-semibold text-gray-500">Effectif (salariés)</span>
                    {effectifFilters.length>0 && (
                      <button onClick={()=>{setEffectifFilters([]);setPage(1)}} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium">Effacer</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {EFFECTIF_TRANCHES.map(t=>{
                      const checked = effectifFilters.includes(t.value)
                      return (
                        <button key={t.value} onClick={()=>{setEffectifFilters(p=>checked?p.filter(v=>v!==t.value):[...p,t.value]);setPage(1)}}
                          className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${checked?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11.5px] font-semibold text-gray-500">Tranche de capital</span>
                    {capitalFilters.length>0 && (
                      <button onClick={()=>{setCapitalFilters([]);setPage(1)}} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium">Effacer</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {CAPITAL_TRANCHES.map(t=>{
                      const checked = capitalFilters.includes(t.val)
                      return (
                        <button key={t.val} onClick={()=>{setCapitalFilters(p=>checked?p.filter(v=>v!==t.val):[...p,t.val]);setPage(1)}}
                          className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${checked?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination info */}
        {!loading && filteredLeads.length > PER_PAGE && (
          <div className="flex items-center justify-between mb-3 text-[12.5px] text-gray-400">
            <span>{filteredLeads.length.toLocaleString('fr-FR')} leads · page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={()=>setPage(1)} disabled={page===1} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30">«</button>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30">‹</button>
              <span className="px-3 py-1 text-gray-600 font-semibold bg-white border border-gray-200 rounded">{page}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30">›</button>
              <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30">»</button>
            </div>
          </div>
        )}

        {/* Leads */}
        {loading?(
          <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin"/></div>
        ):leads.length===0?(
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users2 className="w-8 h-8 text-indigo-300"/>
            </div>
            <h3 className="font-bold text-gray-700 text-[16px] mb-1.5">Aucun lead</h3>
            <p className="text-gray-400 text-[13.5px] mb-5 max-w-xs mx-auto">
              Injectez des entreprises depuis vos recherches pour commencer à les suivre.
            </p>
            <Link href="/databases" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-[14px] hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors">
              <ArrowRight className="w-4 h-4 rotate-180"/>Aller à mes données
            </Link>
          </div>
        ):(
          <div className="space-y-3">
            {pagedLeads.map(lead=>(
              <LeadCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={removeLead} onUnlock={handleUnlock}/>
            ))}
          </div>
        )}

        {/* Bottom pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">← Précédent</button>
            <span className="text-[13px] text-gray-400 px-2">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">Suivant →</button>
          </div>
        )}
      </div>
    </div>
  )
}
