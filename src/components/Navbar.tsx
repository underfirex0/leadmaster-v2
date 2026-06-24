'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search, LayoutDashboard, Wallet, LogOut, ChevronDown,
  Users2, Crown, Target, Settings, Database, Upload,
  Menu, X, Unlock
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile & { plan_id?: string; is_admin?: boolean }
  blockedFeatures?: string[]
}

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
  decouverte: { label: '🌱',            color: 'bg-surface-2 text-ink-3 border-[rgba(0,0,0,0.08)]' },
  solo:       { label: '⚡ Solo',        color: 'bg-brand-50 text-brand-700 border-brand-100' },
  equipe:     { label: '👥 Équipe',      color: 'bg-violet-50 text-violet-700 border-violet-100' },
  business:   { label: '🚀 Business',    color: 'bg-gold-50 text-gold-700 border-gold-100' },
  entreprise: { label: '🏢 Ent.',        color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
}

export default function Navbar({ profile, blockedFeatures = [] }: NavbarProps) {
  const pathname   = usePathname()
  const router     = useRouter()
  const [open, setOpen]           = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [credits, setCredits]     = useState(profile.credit_balance)
  const dropRef  = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setCredits(profile.credit_balance) }, [profile.credit_balance])
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/'); router.refresh()
  }

  const is = (feature: string) => !blockedFeatures.includes(feature)

  const allNavLinks = [
    { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard, feature: null },
    { href: '/search',    label: 'Recherche',    icon: Search,          feature: 'search' },
    { href: '/my-data',   label: 'Mes Données',  icon: Unlock,          feature: 'search' },
    { href: '/crm',       label: 'CRM',          icon: Users2,          feature: 'crm' },
    { href: '/upload',    label: 'Import',        icon: Upload,          feature: 'data_upload' },
  ]
  const navLinks = allNavLinks.filter(l => !l.feature || is(l.feature))
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const planId   = profile.plan_id ?? 'decouverte'
  const planBadge = PLAN_BADGES[planId] ?? PLAN_BADGES.decouverte

  const accountLinks = [
    { href: '/account',      label: 'Mon compte',      icon: Settings, feature: null },
    { href: '/account/plan', label: 'Changer de plan', icon: Crown,    feature: null },
    { href: '/crm',          label: 'Mon CRM',         icon: Users2,   feature: 'crm' },
    { href: '/wallet',       label: 'Mes crédits',     icon: Wallet,   feature: null },
    { href: '/databases',    label: 'Mes recherches',  icon: Database, feature: 'search' },
  ].filter(item => !item.feature || is(item.feature))

  const NavContent = () => (
    <>
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
          <Target className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-ink-1 text-[15px] tracking-tight">LeadMaster</span>
      </Link>

      {/* Nav links */}
      <nav className="hidden lg:flex items-center gap-0.5 mx-4 flex-1">
        {navLinks.map(l => {
          const Icon = l.icon
          const active = isActive(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-3 hover:text-ink-1 hover:bg-surface-2'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {l.label}
              {/* "Mes Données" badge if on search */}
              {l.href === '/my-data' && (
                <span className="ml-0.5 inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-pill px-1.5 py-0">
                  DATA
                </span>
              )}
            </Link>
          )
        })}

        {/* MeetMaster link (Coming Soon) */}
        <Link
          href="/meetmaster"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-ink-3 hover:text-gold-600 hover:bg-gold-50 transition-all duration-150"
        >
          <Crown className="w-3.5 h-3.5" />
          MeetMaster
          <span className="text-[10px] font-bold text-gold-600 bg-gold-50 border border-gold-200 rounded-pill px-1.5 py-0">
            Bientôt
          </span>
        </Link>
      </nav>

      {/* Right: Credits + Profile */}
      <div className="hidden lg:flex items-center gap-3 shrink-0">

        {/* Credit balance */}
        <Link href="/wallet" className="flex items-center gap-1.5 bg-gold-50 border border-gold-200 hover:bg-gold-100 transition-colors rounded-pill px-3 py-1.5">
          <span className="text-[10px] text-gold-500">◆</span>
          <span className="text-[14px] font-bold font-mono text-gold-800 tabular-nums">{credits.toLocaleString()}</span>
          <span className="text-[10px] text-gold-500">cr</span>
        </Link>

        {/* Profile dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-150',
              open
                ? 'bg-surface-2 border-[rgba(0,0,0,0.1)] shadow-sm'
                : 'border-[rgba(0,0,0,0.08)] hover:bg-surface-1 hover:border-[rgba(0,0,0,0.1)]'
            )}
          >
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-[11px] font-bold text-white">
              {(profile.full_name || profile.email)[0].toUpperCase()}
            </div>
            <span className="text-[12.5px] font-medium text-ink-1 max-w-[100px] truncate">
              {profile.full_name || profile.email.split('@')[0]}
            </span>
            <span className={cn('text-[10px] font-semibold border rounded-pill px-1.5 py-0 hidden sm:block', planBadge.color)}>
              {planBadge.label}
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-ink-4 transition-transform duration-150', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[rgba(0,0,0,0.09)] rounded-2xl shadow-floating overflow-hidden z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
                <div className="text-[12px] font-semibold text-ink-1 truncate">{profile.full_name || '—'}</div>
                <div className="text-[11.5px] text-ink-4 truncate">{profile.email}</div>
              </div>
              <div className="p-1.5">
                {accountLinks.map(item => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-ink-2 hover:bg-surface-1 hover:text-ink-1 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-ink-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
              <div className="border-t border-[rgba(0,0,0,0.06)] p-1.5">
                {profile.is_admin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-ink-2 hover:bg-surface-1 font-semibold text-brand-700"
                  >
                    🔐 Admin
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile burger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors ml-auto"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  )

  const MobileDrawer = () => (
    <div className="fixed inset-0 z-[200] flex" onClick={() => setMobileOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative ml-auto w-[280px] h-full bg-white shadow-floating flex flex-col animate-slide-in-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[rgba(0,0,0,0.07)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-ink-1 text-[15px]">LeadMaster</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-2">
            <X className="w-4 h-4 text-ink-3" />
          </button>
        </div>

        {/* Credits */}
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
          <Link href="/wallet" onClick={() => setMobileOpen(false)} className="flex items-center justify-between">
            <span className="text-[13px] text-ink-3">Crédits disponibles</span>
            <div className="flex items-center gap-1.5 bg-gold-50 border border-gold-200 rounded-pill px-2.5 py-1">
              <span className="text-[10px] text-gold-500">◆</span>
              <span className="text-[14px] font-bold font-mono text-gold-800">{credits.toLocaleString()}</span>
              <span className="text-[10px] text-gold-500">cr</span>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navLinks.map(l => {
            const Icon = l.icon
            const active = isActive(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium transition-colors',
                  active ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-surface-1'
                )}
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </Link>
            )
          })}
          <Link href="/meetmaster" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-ink-2 hover:bg-gold-50 hover:text-gold-700 transition-colors">
            <Crown className="w-4 h-4" /> MeetMaster
            <span className="ml-auto text-[10px] font-bold text-gold-600 bg-gold-50 border border-gold-200 rounded-pill px-2 py-0.5">Bientôt</span>
          </Link>
        </nav>

        {/* Mobile footer */}
        <div className="p-3 border-t border-[rgba(0,0,0,0.07)]">
          {profile.is_admin && (
            <Link href="/admin" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-brand-700 hover:bg-brand-50 mb-1">
              🔐 Administration
            </Link>
          )}
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.07)] shadow-[var(--sh-xs)]">
        <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center gap-3">
          <NavContent />
        </div>
      </header>
      {mounted && mobileOpen && createPortal(<MobileDrawer />, document.body)}
    </>
  )
}
