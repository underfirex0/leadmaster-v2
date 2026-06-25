'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Loader2, Plus, X, CreditCard, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(n: number) { return new Intl.NumberFormat('fr-MA').format(n) }
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'short', year:'numeric' }).format(new Date(d))
}

const PLAN_BADGE: Record<string,string> = {
  decouverte:'bg-gray-100 text-gray-500', solo:'bg-indigo-50 text-indigo-700',
  equipe:'bg-violet-50 text-violet-700',  business:'bg-amber-50 text-amber-700',
  entreprise:'bg-emerald-50 text-emerald-700',
}
const PLAN_LABEL: Record<string,string> = {
  decouverte:'Découverte', solo:'Solo', equipe:'Équipe', business:'Business', entreprise:'Entreprise',
}
const PLANS = ['decouverte','solo','equipe','business','entreprise']

type User = { id:string; email:string; full_name:string|null; plan_id:string; credit_balance:number; is_admin:boolean; created_at:string }

function UserModal({ user, onClose, onSuccess }: { user:User; onClose:()=>void; onSuccess:()=>void }) {
  const [tab, setTab] = useState<'activate'|'credits'|'info'>('info')
  const [planId, setPlanId] = useState(user.plan_id)
  const [credits, setCredits] = useState(500)
  const [reason, setReason] = useState('Crédit manuel admin')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string|null>(null)

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  async function doAction(action:string, extra?:Record<string,unknown>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ action, ...extra }),
      })
      const d = await res.json()
      if (!res.ok) { showToast(d.error||'Erreur'); return }
      showToast(d.message||'Succès')
      onSuccess(); onClose()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl">
        {toast && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-[13px] font-semibold">{toast}</div>}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-[15px] text-gray-900">{user.full_name || user.email}</p>
            <p className="text-[12px] text-gray-400">{user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex gap-1 px-6 pt-4">
          {([['info','Infos'],['activate','Activer plan'],['credits','Crédits']] as [string,string][]).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k as typeof tab)}
              className={cn('px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors',
                tab===k ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
        <div className="p-6 space-y-4">
          {tab==='info' && (
            <div className="space-y-3">
              {[
                ['Email', user.email],
                ['Plan actuel', PLAN_LABEL[user.plan_id]||user.plan_id],
                ['Crédits', fmt(user.credit_balance)],
                ['Inscrit le', fmtDate(user.created_at)],
                ['Admin', user.is_admin ? 'Oui' : 'Non'],
              ].map(([k,v])=>(
                <div key={k} className="flex justify-between text-[13px]">
                  <span className="text-gray-400 font-medium">{k}</span>
                  <span className="text-gray-800 font-semibold">{v}</span>
                </div>
              ))}
              <div className="pt-2 flex gap-2">
                <button onClick={()=>doAction(user.is_admin?'revoke_admin':'grant_admin')} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  {user.is_admin ? 'Révoquer admin' : 'Rendre admin'}
                </button>
              </div>
            </div>
          )}
          {tab==='activate' && (
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.map(p=>(
                    <button key={p} onClick={()=>setPlanId(p)}
                      className={cn('py-2.5 rounded-xl border-2 text-[13px] font-semibold transition-all',
                        planId===p ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-gray-200')}>
                      {PLAN_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>doAction('activate_plan',{plan_id:planId})} disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-[14px] hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                Activer {PLAN_LABEL[planId]}
              </button>
            </div>
          )}
          {tab==='credits' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[100,250,500,1000,2500,5000].map(n=>(
                  <button key={n} onClick={()=>setCredits(n)}
                    className={cn('px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all',
                      credits===n ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300')}>
                    +{fmt(n)}
                  </button>
                ))}
              </div>
              <input type="number" value={credits} onChange={e=>setCredits(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-mono focus:outline-none focus:border-indigo-400" />
              <input value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="Raison..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400" />
              <button onClick={()=>doAction('add_credits',{amount:credits,reason})} disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-[14px] hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CreditCard className="w-4 h-4"/>}
                Ajouter {fmt(credits)} crédits
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<User[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<User|null>(null)
  const PER_PAGE = 20

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) })
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    const r = await fetch(`/api/admin/users?${params}`)
    const d = await r.json()
    setUsers(d.users ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }, [page, search, planFilter])

  useEffect(() => { fetch_() }, [fetch_])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      {selected && <UserModal user={selected} onClose={()=>setSelected(null)} onSuccess={fetch_} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-400 text-[13px]">{total} comptes au total</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
            placeholder="Email, nom..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400" />
        </div>
        <select value={planFilter} onChange={e=>{setPlanFilter(e.target.value);setPage(1)}}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-indigo-400">
          <option value="">Tous les plans</option>
          {PLANS.map(p=><option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Utilisateur','Plan','Crédits','Inscrit','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i}>{[1,2,3,4,5].map(j=>(
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              )) : users.map(u=>(
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-indigo-700">
                        {(u.full_name||u.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[200px]">{u.full_name||'—'}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', PLAN_BADGE[u.plan_id??'decouverte'])}>
                      {PLAN_LABEL[u.plan_id??'decouverte']}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-gray-700 font-semibold">{fmt(u.credit_balance)}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={()=>setSelected(u)}
                      className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                      Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-[12px] text-gray-400">Page {page}/{totalPages} — {total} utilisateurs</span>
          <div className="flex gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
