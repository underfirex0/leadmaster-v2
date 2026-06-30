'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Check, X, RefreshCw, Loader2,
  ChevronDown, Building2, User, Clock, Coins,
  CheckCircle, XCircle, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RefundRequest = {
  id: string
  user_id: string
  company_id: string | null
  lead_id: string
  company_name: string | null
  reason: string
  note: string | null
  credits_to_refund: number
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  resolved_at: string | null
  profiles: { email: string; full_name: string | null } | null
}

const REASON_LABELS: Record<string, string> = {
  closed:         '🚫 Entreprise fermée',
  wrong_number:   '📵 Numéro incorrect',
  wrong_director: '👤 Dirigeant incorrect',
  wrong_address:  '🏠 Adresse incorrecte',
  not_exist:      '❌ Entreprise n\'existe pas',
  other:          '💬 Autre',
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function RequestCard({ req, onAction }: {
  req: RefundRequest
  onAction: (id: string, action: 'approve' | 'reject', note?: string) => Promise<void>
}) {
  const [loading,   setLoading]   = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [showNote,  setShowNote]  = useState(false)

  async function act(action: 'approve' | 'reject') {
    setLoading(true)
    await onAction(req.id, action, adminNote || undefined)
    setLoading(false)
  }

  const isPending = req.status === 'pending'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-5 transition-all',
      isPending ? 'border-gray-100' : req.status === 'approved' ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/20'
    )}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Left: company + user info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-[15px] text-gray-900">{req.company_name ?? req.company_id ?? '—'}</span>
            <span className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
              req.status === 'pending'  ? 'text-amber-700 bg-amber-50 border-amber-200'
              : req.status === 'approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              :                             'text-red-700 bg-red-50 border-red-200'
            )}>
              {req.status === 'pending' ? '⏳ En attente' : req.status === 'approved' ? '✓ Approuvé' : '✗ Rejeté'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3"/>{req.profiles?.full_name || req.profiles?.email || req.user_id.slice(0,8)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{timeAgo(req.created_at)}</span>
            <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-500"/><span className="font-semibold text-amber-600">{req.credits_to_refund} cr</span></span>
          </div>
        </div>

        {/* Right: action buttons */}
        {isPending && (
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin"/>
            ) : (
              <>
                <button onClick={() => setShowNote(!showNote)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  title="Ajouter une note admin">
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showNote && 'rotate-180')}/>
                </button>
                <button onClick={() => act('reject')}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl px-3 py-2 transition-colors">
                  <XCircle className="w-3.5 h-3.5"/>Rejeter
                </button>
                <button onClick={() => act('approve')}
                  className="flex items-center gap-1.5 text-[12.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3 py-2 transition-colors shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5"/>Rembourser {req.credits_to_refund} cr
                </button>
              </>
            )}
          </div>
        )}

        {!isPending && req.resolved_at && (
          <span className="text-[12px] text-gray-400">Traité {timeAgo(req.resolved_at)}</span>
        )}
      </div>

      {/* Reason + note */}
      <div className="mt-3 flex items-start gap-3 flex-wrap">
        <span className="text-[12.5px] font-medium text-gray-700 bg-gray-100 rounded-lg px-2.5 py-1">
          {REASON_LABELS[req.reason] ?? req.reason}
        </span>
        {req.note && (
          <span className="text-[12.5px] text-gray-500 italic">"{req.note}"</span>
        )}
      </div>

      {/* Admin note input */}
      {showNote && isPending && (
        <div className="mt-3">
          <input value={adminNote} onChange={e => setAdminNote(e.target.value)}
            placeholder="Note interne (optionnel)..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-300"/>
        </div>
      )}

      {/* Admin note display for resolved */}
      {req.admin_note && !isPending && (
        <div className="mt-2 text-[12px] text-gray-400 italic">Note admin: {req.admin_note}</div>
      )}

      {/* Company ID for tracking */}
      {req.company_id && (
        <div className="mt-2 text-[11px] text-gray-300 font-mono">ID: {req.company_id}</div>
      )}
    </div>
  )
}

export default function SignalementsPage() {
  const [requests, setRequests] = useState<RefundRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'pending'|'approved'|'rejected'>('pending')
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'}|null>(null)

  function showToast(msg: string, type: 'success'|'error' = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/refund-requests?status=${tab}`)
    const d = await r.json()
    setRequests(d.requests ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function handleAction(id: string, action: 'approve'|'reject', note?: string) {
    const r = await fetch(`/api/refund-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_note: note }),
    })
    const d = await r.json()
    if (!r.ok) { showToast(d.error || 'Erreur', 'error'); return }
    showToast(d.message)
    // Remove from current list
    setRequests(prev => prev.filter(req => req.id !== id))
  }

  const TABS = [
    { key:'pending',  label:'En attente',  color:'text-amber-600' },
    { key:'approved', label:'Approuvés',   color:'text-emerald-600' },
    { key:'rejected', label:'Rejetés',     color:'text-red-600' },
  ]

  const pendingCredits = requests
    .filter(r => r.status === 'pending')
    .reduce((s, r) => s + (r.credits_to_refund ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-[13px] font-semibold text-white shadow-xl',
          toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900')}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500"/>Signalements & Remboursements
            </h1>
            <p className="text-[13.5px] text-gray-400 mt-0.5">
              Gérez les demandes de remboursement et identifiez les données invalides
            </p>
          </div>
          <button onClick={fetchRequests}
            className="flex items-center gap-1.5 text-[13px] text-gray-500 border border-gray-200 bg-white rounded-xl px-3 py-2 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5"/>Actualiser
          </button>
        </div>

        {/* Stats */}
        {tab === 'pending' && requests.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="text-[28px] font-bold text-amber-600">{requests.length}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">Demandes en attente</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="text-[28px] font-bold text-amber-600">{pendingCredits.toLocaleString('fr-FR')}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">Crédits à rembourser</div>
            </div>
          </div>
        )}

        {/* Data invalide banner */}
        {tab === 'pending' && requests.filter(r => r.reason === 'closed' || r.reason === 'not_exist').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-[13px] font-semibold text-red-700">
                {requests.filter(r => r.reason === 'closed' || r.reason === 'not_exist').length} entreprise(s) fermées ou inexistantes signalées
              </p>
              <p className="text-[12px] text-red-500 mt-0.5">
                Après traitement, pensez à supprimer ces entrées de votre base de données principale.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5">
          <div className="flex border-b border-gray-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={cn(
                  'flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors',
                  tab === t.key ? `border-indigo-500 ${t.color} bg-indigo-50/40` : 'border-transparent text-gray-400 hover:text-gray-600'
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin"/>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <Check className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
            <p className="text-gray-400 text-[14px]">
              {tab === 'pending' ? 'Aucune demande en attente' : 'Aucun signalement dans cette catégorie'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <RequestCard key={req.id} req={req} onAction={handleAction}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
