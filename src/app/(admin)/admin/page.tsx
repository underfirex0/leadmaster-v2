'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Users, Database, Zap, Clock,
  CheckCircle, AlertCircle, ArrowRight, Search, Unlock
} from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(n: number) { return new Intl.NumberFormat('fr-MA').format(n) }
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(d))
}

const PLAN_BADGE: Record<string, string> = {
  decouverte: 'bg-gray-100 text-gray-500', solo: 'bg-indigo-50 text-indigo-700',
  equipe: 'bg-violet-50 text-violet-700',  business: 'bg-amber-50 text-amber-700',
  entreprise: 'bg-emerald-50 text-emerald-700',
}
const PLAN_LABEL: Record<string, string> = {
  decouverte:'Découverte', solo:'Solo', equipe:'Équipe', business:'Business', entreprise:'Entreprise',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-100 rounded-xl" />
      {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100" />)}
    </div>
  )
  if (!stats) return <div className="text-red-500 p-4">Erreur de chargement.</div>

  const planDist    = (stats.plan_distribution as Record<string,number>) ?? {}
  const recentUsers = (stats.recent_users as Record<string,unknown>[]) ?? []
  const pending     = (stats.pending_count as number) ?? 0

  const kpis = [
    { label:'Utilisateurs',     val: fmt(stats.total_users as number),     sub:`${fmt(stats.active_subs as number ?? 0)} abonnés`,   icon:Users,    color:'text-indigo-600 bg-indigo-50', link:'/admin/users' },
    { label:'Entreprises DB',   val: fmt(stats.total_companies as number), sub:'dans la base telecontact',                             icon:Database, color:'text-violet-600 bg-violet-50', link:'/admin/data' },
    { label:'Déverrouillages',  val: fmt(stats.total_unlocks as number),   sub:`${fmt(stats.total_searches as number ?? 0)} recherches`, icon:Unlock, color:'text-emerald-600 bg-emerald-50', link:'/admin/users' },
    { label:'Crédits ce mois',  val: fmt(stats.credits_used_month as number), sub:'crédits consommés',                                icon:Zap,      color:'text-amber-600 bg-amber-50',  link:'/admin/users' },
  ]

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-[13px] md:text-[14px] text-gray-400 mt-0.5">Vue d'ensemble de la plateforme</p>
        </div>
        {pending > 0 && (
          <Link href="/admin/subscriptions?status=pending"
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-[13px] font-semibold hover:bg-red-100 transition-colors animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {pending} action{pending > 1 ? 's' : ''} en attente
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {kpis.map(({ label, val, sub, icon: Icon, color, link }) => (
          <Link key={label} href={link}
            className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] md:text-[12px] font-medium text-gray-400">{label}</p>
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
            </div>
            <p className="font-bold text-gray-900 tabular-nums text-[18px] md:text-[22px] leading-none mb-1">{val}</p>
            <p className="text-[10px] md:text-[11px] text-gray-400">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Plan distribution */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-[14px] text-gray-900">Répartition des plans</p>
            <Link href="/admin/users" className="text-[12px] text-indigo-600 hover:underline">Voir →</Link>
          </div>
          <div className="p-5 space-y-3">
            {['decouverte','solo','equipe','business','entreprise'].map(pid => {
              const count = planDist[pid] ?? 0
              const total = (stats.total_users as number) || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={pid}>
                  <div className="flex items-center justify-between text-[13px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', PLAN_BADGE[pid])}>
                        {PLAN_LABEL[pid]}
                      </span>
                      <span className="font-semibold text-gray-800">{count}</span>
                    </div>
                    <span className="text-gray-400 text-[11px]">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all',
                      pid==='solo'?'bg-indigo-500': pid==='equipe'?'bg-violet-500':
                      pid==='business'?'bg-amber-500': pid==='entreprise'?'bg-emerald-500':'bg-gray-300'
                    )} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-[14px] text-gray-900">Revenus</p>
            <Link href="/admin/invoices" className="text-[12px] text-indigo-600 hover:underline">Factures →</Link>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label:'MRR estimé',    val:`${fmt(stats.mrr as number ?? 0)} MAD`,           dot:'bg-indigo-500' },
              { label:'Abonnements',   val:`${fmt(stats.sub_revenue as number ?? 0)} MAD`,   dot:'bg-violet-500' },
              { label:'Top-ups',       val:`${fmt(stats.topup_revenue as number ?? 0)} MAD`, dot:'bg-amber-500' },
              { label:'En attente',    val:`${fmt(stats.pending_amount as number ?? 0)} MAD`,dot:'bg-orange-400' },
            ].map(({ label, val, dot }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-[13px] text-gray-600">{label}</span>
                </div>
                <span className="font-bold text-[13px] text-gray-900 tabular-nums">{val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[13px] font-bold text-gray-800">Total TTC</span>
              <span className="font-bold text-[15px] text-indigo-700 tabular-nums">{fmt(stats.total_revenue as number ?? 0)} MAD</span>
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-[14px] text-gray-900">Inscriptions récentes</p>
            <Link href="/admin/users" className="text-[12px] text-indigo-600 hover:underline">Tous →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers.slice(0, 7).map(u => (
              <Link key={u.id as string} href={`/admin/users?search=${u.email}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-indigo-700 font-bold text-[11px]">
                    {((u.full_name as string || u.email as string || 'U')[0]).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-800 truncate">{(u.full_name as string) || (u.email as string)}</p>
                  <p className="text-[10px] text-gray-400">{fmtDate(u.created_at as string)}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0', PLAN_BADGE[(u.plan_id as string) ?? 'decouverte'])}>
                  {PLAN_LABEL[(u.plan_id as string) ?? 'decouverte']}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href:'/admin/subscriptions?status=pending', label:'Activer abonnements', sub:`${pending} en attente`,            icon:CheckCircle, warn: pending > 0 },
          { href:'/admin/users',                         label:'Utilisateurs',         sub:`${fmt(stats.total_users as number)} comptes`, icon:Users, warn:false },
          { href:'/admin/data',                          label:'Base de données',       sub:`${fmt(stats.total_companies as number)} entreprises`, icon:Database, warn:false },
          { href:'/admin/invoices',                      label:'Factures',             sub:`${fmt(stats.pending_amount as number ?? 0)} MAD en attente`, icon:Clock, warn:false },
        ].map(({ href, label, sub, icon: Icon, warn }) => (
          <Link key={href} href={href}
            className={cn('flex items-start gap-3 p-4 rounded-2xl border transition-all group',
              warn ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'bg-white border-gray-100 hover:bg-gray-50 hover:shadow-sm')}>
            <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', warn ? 'text-red-500' : 'text-gray-400')} />
            <div className="min-w-0">
              <p className="font-semibold text-[13px] text-gray-800">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
