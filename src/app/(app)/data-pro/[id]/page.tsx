'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Download, Users2, Phone, Mail, Globe, User, Building2,
  MapPin, Loader2, Crown, ExternalLink, DollarSign, Calendar, FileText,
  CheckSquare, Square, Lock, Sparkles, Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STANDARD_FIELDS } from '@/lib/dataProConstants'

type Dataset = {
  id: string; name: string; description: string | null; sector_tag: string | null
  credit_cost: number; record_count: number; cover_emoji: string | null
  field_schema: { key: string; label: string; type: string }[]
}
type Row = Record<string, unknown> & { id: string; name: string; city: string | null; extra_fields?: Record<string, unknown> }

const ICONS: Record<string, React.ElementType> = {
  phone_1: Phone, phone_2: Phone, email: Mail, website: Globe, director: User,
  address_raw: MapPin, ice: Building2, rc: Building2, capital: DollarSign,
  effectif: Users2, forme_juridique: FileText, annee_creation: Calendar, primary_sector: Tag,
}

function formatCapital(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.').replace(/\s/g, ''))
  return isNaN(n) ? val : n.toLocaleString('fr-FR') + ' MAD'
}

function StdField({ fkey, label, icon: Icon, value }: { fkey: string; label: string; icon: React.ElementType; value: unknown }) {
  const v = value != null && value !== '' ? String(value) : null
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0" />{label}
      </span>
      {!v ? (
        <span className="text-[12px] text-gray-300 italic">Non renseigné</span>
      ) : fkey === 'phone_1' || fkey === 'phone_2' ? (
        <a href={`tel:${v}`} className="font-mono text-[12.5px] text-gray-800 hover:text-amber-700 truncate">{v}</a>
      ) : fkey === 'email' ? (
        <a href={`mailto:${v}`} className="text-[12.5px] text-gray-800 hover:text-amber-700 truncate">{v}</a>
      ) : fkey === 'website' ? (
        <a href={v.startsWith('http') ? v : `https://${v}`} target="_blank" rel="noopener noreferrer"
          className="text-[12.5px] text-amber-700 hover:underline flex items-center gap-1 truncate">
          {v.replace(/^https?:\/\//, '')}<ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50" />
        </a>
      ) : fkey === 'capital' ? (
        <span className="text-[12.5px] text-gray-800 font-medium">{formatCapital(v)}</span>
      ) : (
        <span className="text-[12.5px] text-gray-800 truncate">{v}</span>
      )}
    </div>
  )
}

function RowCard({ row, schema, selected, onToggle }: {
  row: Row; schema: { key: string; label: string; type: string }[]
  selected: boolean; onToggle: (id: string) => void
}) {
  const initials = (n: string) => (n || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const extra = row.extra_fields ?? {}

  return (
    <div className={cn('bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all',
      selected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-100')}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <button onClick={() => onToggle(row.id)} className={cn('mt-0.5 shrink-0', selected ? 'text-amber-600' : 'text-gray-200 hover:text-gray-400')}>
            {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold text-[12px] flex items-center justify-center shrink-0">
            {initials(row.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">{row.name}</h3>
            <div className="flex items-center gap-1.5 text-[11.5px] text-gray-400 flex-wrap mt-0.5">
              {row.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 shrink-0" />{row.city}</span>}
              {row.primary_sector != null && String(row.primary_sector) && (
                <><span className="text-gray-200">·</span><span>{String(row.primary_sector)}</span></>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pt-3 border-t border-gray-50">
          {STANDARD_FIELDS.filter(f => f.key !== 'primary_sector' && row[f.key] != null && row[f.key] !== '').map(f => (
            <StdField key={f.key} fkey={f.key} label={f.label} icon={ICONS[f.key] || FileText} value={row[f.key]} />
          ))}
        </div>

        {schema.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-3 mt-3 border-t border-gray-50">
            {schema.filter(s => extra[s.key] != null && extra[s.key] !== '').map(s => (
              <div key={s.key} className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/80">{s.label}</span>
                {s.type === 'url' ? (
                  <a href={String(extra[s.key]).startsWith('http') ? String(extra[s.key]) : `https://${extra[s.key]}`}
                    target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-amber-700 hover:underline truncate">
                    {String(extra[s.key])}
                  </a>
                ) : s.type === 'email' ? (
                  <a href={`mailto:${extra[s.key]}`} className="text-[12.5px] text-gray-800 hover:text-amber-700 truncate">{String(extra[s.key])}</a>
                ) : (
                  <span className={cn('text-[12.5px] text-gray-800', s.type === 'longtext' ? 'line-clamp-3' : 'truncate')}>
                    {String(extra[s.key])}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataProDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [preview, setPreview] = useState<Row[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [injecting, setInjecting] = useState(false)
  const [bulkInj, setBulkInj] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const PER_PAGE = 24

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/data-pro/${id}`)
    const d = await r.json()
    if (r.ok) {
      setDataset(d.dataset); setUnlocked(d.unlocked); setRows(d.companies ?? [])
      setPreview(d.preview ?? []); setBalance(d.balance)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handlePurchase() {
    setPurchasing(true)
    const r = await fetch(`/api/data-pro/${id}/unlock`, { method: 'POST' })
    const d = await r.json()
    if (!r.ok) { showToast(d.error || 'Erreur', 'error'); setPurchasing(false); return }
    showToast('Dataset débloqué ✓')
    setPurchasing(false)
    await load()
  }

  async function handleCSV() {
    const r = await fetch(`/api/data-pro/${id}/export`)
    if (!r.ok) { showToast('Erreur export', 'error'); return }
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `leadmaster-pro-${id.slice(0, 8)}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('Export téléchargé ✓')
  }

  async function injectIds(ids: string[]) {
    const r = await fetch(`/api/data-pro/${id}/inject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_ids: ids }),
    })
    const d = await r.json()
    showToast(r.ok ? d.message : (d.error || 'Erreur'), r.ok ? 'success' : 'error')
  }

  async function handleInjectAll() {
    setInjecting(true); await injectIds(rows.map(r => r.id)); setInjecting(false)
  }
  async function handleInjectSelected() {
    if (!selected.size) return
    setBulkInj(true); await injectIds([...selected]); setSelected(new Set()); setBulkInj(false)
  }
  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /></div>
  if (!dataset) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Dataset introuvable</div>

  const totalPages = Math.ceil(rows.length / PER_PAGE)
  const paged = rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const allSelected = selected.size === rows.length && rows.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-[13px] font-semibold text-white max-w-sm',
          toast.type === 'success' ? 'bg-gray-900' : 'bg-red-500')}>{toast.msg}</div>
      )}

      <div className="max-w-[1100px] mx-auto px-4 py-6 sm:py-8">
        <Link href="/data-pro" className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600 mb-4">
          <ChevronLeft className="w-4 h-4" />DATA Pro
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-[36px]">{dataset.cover_emoji || '💎'}</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] sm:text-[26px] font-bold text-gray-900">{dataset.name}</h1>
                {unlocked ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">✓ PRO débloqué</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> PREMIUM
                  </span>
                )}
              </div>
              {dataset.description && <p className="text-gray-400 text-[13px] mt-0.5 max-w-lg">{dataset.description}</p>}
            </div>
          </div>
          {unlocked && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleCSV} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 border border-gray-200 bg-white rounded-xl px-4 py-2.5 hover:bg-gray-50">
                <Download className="w-4 h-4" />CSV
              </button>
              <button onClick={handleInjectAll} disabled={injecting}
                className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-amber-600 rounded-xl px-4 py-2.5 hover:bg-amber-700 shadow-md">
                {injecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />}
                Tout injecter → CRM
              </button>
            </div>
          )}
        </div>

        {!unlocked ? (
          // ── Purchase gate ──────────────────────────────────
          <div className="bg-gradient-to-br from-white to-amber-50/50 border border-amber-200 rounded-2xl p-6 sm:p-8">
            <div className="grid sm:grid-cols-3 gap-6 mb-6">
              {[
                { label: 'Entreprises', val: dataset.record_count.toLocaleString('fr-FR') },
                { label: 'Champs premium', val: `${STANDARD_FIELDS.length + dataset.field_schema.length}+` },
                { label: 'Secteur', val: dataset.sector_tag || 'Général' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <div className="text-[20px] font-bold text-gray-900">{s.val}</div>
                  <div className="text-[11.5px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-xl border border-amber-200 p-5 mb-6">
              <div>
                <div className="text-[13px] text-gray-500">Débloquer l&apos;accès complet</div>
                <div className="text-[26px] font-bold text-amber-700">{dataset.credit_cost.toLocaleString('fr-FR')} cr</div>
                <div className="text-[12px] text-gray-400">Paiement unique · accès illimité à toutes les fiches et tous les champs</div>
              </div>
              <button onClick={handlePurchase} disabled={purchasing}
                className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-amber-700 transition-all shadow-md shadow-amber-200 disabled:opacity-60">
                {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                Débloquer maintenant
              </button>
            </div>
            {balance !== null && (
              <p className="text-[12.5px] text-gray-400 mb-6">Solde actuel : <span className="font-semibold text-gray-600">{balance.toLocaleString('fr-FR')} cr</span></p>
            )}

            {/* Blurred preview */}
            {preview.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-gray-500 mb-3">Aperçu</h4>
                <div className="relative">
                  <div className="space-y-2 blur-[3px] select-none pointer-events-none opacity-60">
                    {preview.map(p => (
                      <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-[14px] text-gray-800">{p.name}</div>
                          <div className="text-[12px] text-gray-400">{p.city} · +212 6•• •• •• •• · contact@••••••.ma</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white/95 border border-gray-200 rounded-full px-4 py-2 shadow-md">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[12.5px] font-semibold text-gray-700">Débloquez pour voir toutes les données</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // ── Owned view ──────────────────────────────────────
          <>
            {rows.length > 0 && (
              <div className="flex items-center gap-3 mb-4 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex-wrap">
                <button onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))}
                  className="flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-gray-900">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-gray-300" />}
                  {selected.size > 0 ? `${selected.size} sélectionnée${selected.size > 1 ? 's' : ''}` : 'Tout sélectionner'}
                </button>
                {selected.size > 0 && (
                  <>
                    <div className="h-4 w-px bg-gray-200" />
                    <button onClick={handleInjectSelected} disabled={bulkInj}
                      className="flex items-center gap-1.5 text-[12.5px] font-bold text-white bg-amber-600 rounded-xl px-3.5 py-2 hover:bg-amber-700 shadow-sm">
                      {bulkInj ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users2 className="w-3.5 h-3.5" />}
                      Injecter {selected.size} → CRM
                    </button>
                  </>
                )}
                <span className="ml-auto text-[12px] text-gray-400">{rows.length.toLocaleString('fr-FR')} entreprises</span>
              </div>
            )}

            {rows.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Aucune entreprise dans ce dataset pour le moment.</div>
            ) : (
              <div className="space-y-3">
                {paged.map(r => (
                  <RowCard key={r.id} row={r} schema={dataset.field_schema} selected={selected.has(r.id)} onToggle={toggleSelect} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">← Précédent</button>
                <span className="text-[13px] text-gray-500 px-2">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30">Suivant →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
