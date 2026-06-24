import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Users2, Unlock, Wallet, ArrowRight, TrendingUp,
  Building2, Crown, ChevronRight, Sparkles, Database, MapPin
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getStats(userId: string) {
  const [
    { count: totalUnlocked },
    { count: crmLeads },
    { count: totalCompanies },
    { data: recentUnlocks },
    { data: profile },
  ] = await Promise.all([
    supabaseAdmin.from('company_unlocks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('crm_leads').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('company_unlocks')
      .select('company_id, unlocked_at')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(3),
    supabaseAdmin.from('profiles').select('credit_balance, plan_id').eq('id', userId).single(),
  ])

  // Get company names for recent unlocks
  let recentCompanies: { name: string; city: string | null }[] = []
  if (recentUnlocks?.length) {
    const ids = recentUnlocks.map(u => u.company_id)
    const { data } = await supabaseAdmin
      .from('companies').select('id, name, city').in('id', ids)
    const map: Record<string, { name: string; city: string | null }> = {}
    for (const c of data ?? []) map[c.id] = c
    recentCompanies = ids.map(id => map[id] ?? { name: '—', city: null })
  }

  return {
    totalUnlocked: totalUnlocked ?? 0,
    crmLeads: crmLeads ?? 0,
    totalCompanies: totalCompanies ?? 0,
    recentCompanies,
    creditBalance: profile?.credit_balance ?? 0,
    planId: profile?.plan_id ?? 'decouverte',
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stats = await getStats(user.id)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, is_admin, plan_id, credit_balance')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'là'

  const quickActions = [
    {
      href: '/search',
      icon: Search,
      title: 'Nouvelle recherche',
      desc: 'Filtrez par secteur, ville ou activité',
      color: 'text-brand-600 bg-brand-50 border-brand-100',
      cta: 'Rechercher',
    },
    {
      href: '/my-data',
      icon: Unlock,
      title: 'Mes Données',
      desc: `${stats.totalUnlocked.toLocaleString('fr-MA')} entreprise${stats.totalUnlocked !== 1 ? 's' : ''} déverrouillée${stats.totalUnlocked !== 1 ? 's' : ''}`,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      cta: 'Voir mes données',
    },
    {
      href: '/crm',
      icon: Users2,
      title: 'Mon CRM',
      desc: `${stats.crmLeads} lead${stats.crmLeads !== 1 ? 's' : ''} dans le pipeline`,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
      cta: 'Gérer le CRM',
    },
    {
      href: '/wallet',
      icon: Wallet,
      title: 'Mes crédits',
      desc: `${stats.creditBalance.toLocaleString()} crédits disponibles`,
      color: 'text-gold-600 bg-gold-50 border-gold-100',
      cta: 'Gérer',
    },
  ]

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="max-w-[1100px] mx-auto px-4 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-ink-1 tracking-tight mb-1.5">
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-ink-3 text-[15px]">
            Votre tableau de bord LeadMaster — prospectez plus de 53 000 entreprises marocaines.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Base de données',
              value: stats.totalCompanies.toLocaleString('fr-MA'),
              unit: 'entreprises',
              icon: Database,
              color: 'text-brand-600',
            },
            {
              label: 'Déverrouillées',
              value: stats.totalUnlocked.toLocaleString('fr-MA'),
              unit: 'entreprises',
              icon: Unlock,
              color: 'text-emerald-600',
            },
            {
              label: 'Pipeline CRM',
              value: stats.crmLeads.toLocaleString('fr-MA'),
              unit: 'leads',
              icon: Users2,
              color: 'text-violet-600',
            },
            {
              label: 'Crédits',
              value: stats.creditBalance.toLocaleString('fr-MA'),
              unit: 'disponibles',
              icon: Sparkles,
              color: 'text-gold-600',
            },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[12.5px] text-ink-4 font-medium">{stat.label}</span>
                  <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center">
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-[26px] font-bold text-ink-1 font-mono tabular-nums leading-tight">
                  {stat.value}
                </div>
                <div className="text-[11.5px] text-ink-4 mt-0.5">{stat.unit}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

          {/* Quick actions */}
          <div>
            <h2 className="text-[15px] font-semibold text-ink-1 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" /> Actions rapides
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action, i) => {
                const Icon = action.icon
                return (
                  <Link
                    key={i}
                    href={action.href}
                    className="card p-4 hover:shadow-[var(--sh-card-md)] transition-all duration-200 group"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${action.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-[14px] text-ink-1 mb-1 group-hover:text-brand-700 transition-colors">{action.title}</h3>
                    <p className="text-[12.5px] text-ink-3 mb-3">{action.desc}</p>
                    <div className="flex items-center gap-1 text-[12px] font-semibold text-brand-600">
                      {action.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">

            {/* Recent unlocks */}
            {stats.recentCompanies.length > 0 && (
              <div className="card p-4">
                <h3 className="text-[13px] font-semibold text-ink-1 mb-3 flex items-center justify-between">
                  Dernières déverrouillées
                  <Link href="/my-data" className="text-[11.5px] text-brand-600 font-normal hover:underline flex items-center gap-0.5">
                    Voir tout <ChevronRight className="w-3 h-3" />
                  </Link>
                </h3>
                <div className="space-y-2.5">
                  {stats.recentCompanies.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                        {c.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-ink-1 truncate">{c.name}</div>
                        {c.city && <div className="text-[11px] text-ink-4 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{c.city}</div>}
                      </div>
                      <Unlock className="w-3 h-3 text-emerald-500 shrink-0 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MeetMaster teaser */}
            <div className="card p-4 bg-gradient-to-br from-gold-50 to-amber-50 border-gold-200">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-gold-600" />
                <span className="font-semibold text-[13px] text-gold-800">MeetMaster</span>
                <span className="text-[10px] font-bold text-gold-600 bg-white border border-gold-200 rounded-pill px-1.5 py-0">Bientôt</span>
              </div>
              <p className="text-[12.5px] text-gold-700 mb-3">
                Rencontrez des décideurs marocains — DRH, DAF, Directeurs Achats — en 48h.
              </p>
              <Link href="/meetmaster" className="btn-gold btn-sm inline-flex items-center gap-1.5 text-[12.5px]">
                En savoir plus <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
