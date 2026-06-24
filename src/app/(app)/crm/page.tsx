'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Phone, Mail, Globe, User, MapPin, Clock, ChevronDown, ChevronUp,
  Search, Loader2, Trash2, RefreshCw, CheckCircle, XCircle,
  Star, Archive, PhoneCall, CalendarClock, X, Users2, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'to_call'|'in_progress'|'callback'|'interested'|'not_interested'|'converted'|'archived'

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  to_call:        { label: 'À appeler',     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  in_progress:    { label: 'En cours',      color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  callback:       { label: 'À rappeler',    color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  interested:     { label: 'Intéressé',     color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  not_interested: { label: 'Pas intéressé', color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
  converted:      { label: 'Converti',      color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200' },
  archived:       { label: 'Archivé',       color: 'text-gray-500',   bg: 'bg-gray-100',   border: 'border-gray-200' },
}

type Lead = {
  id: string
  status: Status
  priority: string
  notes: string | null
  callback_date: string | null
  created_at: string
  updated_at: string
  display_name: string
  display_city: string
  display_sector: string
  display_phone: string | null
  display_email: string | null
  display_website: string | null
  display_director: string | null
  display_ice: string | null
  display_address: string | null
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m/60); if (h < 24) return `il y a ${h}h`
  const day = Math.floor(h/24); if (day === 1) return 'hier'; return `il y a ${day}j`
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CFG[status]
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border', c.bg, c.color, c.border)}>{c.label}</span>
}

function LeadCard({ lead, onUpdate, onDelete }: { lead: Lead; onUpdate: (id: string, data: Record<string,unknown>) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [notes, setNotes]         = useState(lead.notes ?? '')
  const [showStatus, setShowStatus] = useState(false)

  const initials = (name: string) => (name||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
  const cfg = STATUS_CFG[lead.status]

  async function updateStatus(status: Status) {
    setShowStatus(false); setSaving(true)
    await fetch(`/api/crm/leads/${lead.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    onUpdate(lead.id, { status }); setSaving(false)
  }

  async function saveNotes() {
    if (notes === lead.notes) return
    await fetch(`/api/crm/leads/${lead.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ notes }) })
    onUpdate(lead.id, { notes })
  }

  async function del() {
    if (!confirm('Supprimer ce lead ?')) return
    await fetch(`/api/crm/leads/${lead.id}`, { method: 'DELETE' })
    onDelete(lead.id)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn('w-10 h-10 rounded-xl font-bold text-[12px] flex items-center justify-center shrink-0', cfg.bg, cfg.color)}>
            {initials(lead.display_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-bold text-[14.5px] text-gray-900 truncate">{lead.display_name}</h3>
                <div className="flex items-center gap-2 text-[12px] text-gray-400 mt-0.5 flex-wrap">
                  {lead.display_city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{lead.display_city}</span>}
                  {lead.display_sector && <span className="text-gray-300">·</span>}
                  {lead.display_sector && <span>{lead.display_sector}</span>}
                  <span className="text-gray-300">·</span>
                  <span>{timeAgo(lead.updated_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <button onClick={() => setShowStatus(!showStatus)}
                    className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border cursor-pointer hover:opacity-80', cfg.bg, cfg.color, cfg.border)}>
                    {cfg.label} <ChevronDown className="w-3 h-3" />
                  </button>
                  {showStatus && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden min-w-[160px]">
                      {(Object.keys(STATUS_CFG) as Status[]).map(s => (
                        <button key={s} onClick={() => updateStatus(s)}
                          className={cn('w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 transition-colors', s === lead.status && 'font-bold')}>
                          {STATUS_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={del} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contact info row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {lead.display_phone && (
                <a href={`tel:${lead.display_phone}`} className="flex items-center gap-1.5 text-[12.5px] text-gray-700 hover:text-indigo-600 font-mono">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />{lead.display_phone}
                </a>
              )}
              {lead.display_email && (
                <a href={`mailto:${lead.display_email}`} className="flex items-center gap-1.5 text-[12.5px] text-gray-600 hover:text-indigo-600 truncate max-w-[200px]">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />{lead.display_email}
                </a>
              )}
              {lead.display_website && (
                <a href={lead.display_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12.5px] text-indigo-600 hover:underline truncate max-w-[180px]">
                  <Globe className="w-3.5 h-3.5 shrink-0" />{lead.display_website.replace(/^https?:\/\//,'')}
                </a>
              )}
              {lead.display_director && (
                <div className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                  <User className="w-3.5 h-3.5 text-indigo-400" />{lead.display_director}
                </div>
              )}
            </div>

            {/* Appeler + expand */}
            <div className="flex items-center gap-2 mt-3">
              {lead.display_phone && (
                <a href={`tel:${lead.display_phone}`}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-indigo-600 rounded-xl px-3.5 py-1.5 hover:bg-indigo-700 shadow-sm transition-all">
                  <Phone className="w-3.5 h-3.5" /> Appeler
                </a>
              )}
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Réduire</> : <><ChevronDown className="w-3.5 h-3.5" /> Voir plus</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {lead.display_address && (
            <div className="flex items-start gap-2 text-[12.5px] text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />{lead.display_address}
            </div>
          )}
          {lead.display_ice && (
            <div className="text-[12px] text-gray-500 font-mono">ICE: {lead.display_ice}</div>
          )}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={3}
              placeholder="Ajouter une note..."
              className="w-full border border-gray-200 rounded-xl p-3 text-[13px] text-gray-700 resize-none focus:outline-none focus:border-indigo-300 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function CRMPage() {
  const [leads, setLeads]     = useState<Lead[]>([])
  const [counts, setCounts]   = useState<Record<string,number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Status|'all'>('all')
  const [search, setSearch]   = useState('')
  const [toast, setToast]     = useState<string|null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchLeads = useCallback(async (status?: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (search) params.set('q', search)
    const r = await fetch(`/api/crm/leads?${params}`)
    const d = await r.json()
    setLeads(d.leads ?? [])
    setCounts(d.counts ?? {})
    setLoading(false)
  }, [search])

  useEffect(() => { fetchLeads(tab === 'all' ? undefined : tab) }, [tab, fetchLeads])

  function updateLead(id: string, data: Record<string,unknown>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } as Lead : l))
    if (data.status) {
      setCounts(prev => {
        const lead = leads.find(l => l.id === id)
        if (!lead) return prev
        const n = { ...prev }
        n[lead.status] = Math.max(0, (n[lead.status]||0) - 1)
        n[data.status as string] = (n[data.status as string]||0) + 1
        return n
      })
    }
  }

  function removeLead(id: string) {
    const lead = leads.find(l => l.id === id)
    setLeads(prev => prev.filter(l => l.id !== id))
    if (lead) setCounts(prev => ({ ...prev, [lead.status]: Math.max(0,(prev[lead.status]||0)-1) }))
    showToast('Lead supprimé')
  }

  const total = Object.values(counts).reduce((s,n) => s+n, 0)

  const TABS = [
    { key: 'all',        label: 'Tous',          cnt: total },
    { key: 'to_call',    label: 'À appeler',     cnt: counts.to_call        || 0 },
    { key: 'in_progress',label: 'En cours',      cnt: counts.in_progress    || 0 },
    { key: 'callback',   label: 'À rappeler',    cnt: counts.callback       || 0 },
    { key: 'interested', label: 'Intéressé',     cnt: counts.interested     || 0 },
    { key: 'converted',  label: 'Converti',      cnt: counts.converted      || 0 },
    { key: 'archived',   label: 'Archivé',       cnt: counts.archived       || 0 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl text-[13px] font-semibold shadow-xl">{toast}</div>}
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Users2 className="w-7 h-7 text-indigo-600" /> CRM — Suivi des leads
            </h1>
            <p className="text-gray-400 text-[14px] mt-1">{total} lead{total!==1?'s':''} au total</p>
          </div>
          <button onClick={() => fetchLeads(tab === 'all' ? undefined : tab)}
            className="flex items-center gap-1.5 text-[13px] text-gray-500 border border-gray-200 bg-white rounded-xl px-3.5 py-2 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label:'À appeler',  val: counts.to_call||0,   color:'text-blue-600',    bg:'bg-blue-50' },
            { label:'À rappeler', val: counts.callback||0,  color:'text-orange-600',  bg:'bg-orange-50' },
            { label:'Intéressé',  val: counts.interested||0,color:'text-green-600',   bg:'bg-green-50' },
            { label:'Converti',   val: counts.converted||0, color:'text-emerald-600', bg:'bg-emerald-50' },
          ].map((s,i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className={cn('text-[26px] font-bold font-mono', s.color)}>{s.val}</div>
              <div className="text-[11.5px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key as Status|'all')}
                className={cn('flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
                {t.label}
                {t.cnt > 0 && <span className={cn('text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500')}>{t.cnt}</span>}
              </button>
            ))}
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un lead par nom, ville, secteur..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-[13px] focus:outline-none focus:border-indigo-300" />
            </div>
          </div>
        </div>

        {/* Leads */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin" /></div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <Users2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-gray-600 text-[16px] mb-1">Aucun lead</h3>
            <p className="text-gray-400 text-[13.5px]">Injectez des entreprises depuis "Mes Données" pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={removeLead} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
