'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, LayoutDashboard, Wallet, LogOut, ChevronDown, Users2, Crown, Target, Settings, Database, Upload, Menu, X, Unlock } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

interface NavbarProps { profile: Profile & { plan_id?: string; is_admin?: boolean }; blockedFeatures?: string[] }

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
  decouverte: { label: '🌱',         color: 'bg-gray-100 text-gray-500 border-gray-200' },
  solo:       { label: '⚡ Solo',    color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  equipe:     { label: '👥 Équipe',  color: 'bg-violet-50 text-violet-700 border-violet-100' },
  business:   { label: '🚀 Biz',    color: 'bg-amber-50 text-amber-700 border-amber-100' },
  entreprise: { label: '🏢 Ent.',   color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/search',    label: 'Recherche',    icon: Search },
  { href: '/databases', label: 'Recherches',   icon: Database },
  { href: '/crm',       label: 'CRM',          icon: Users2 },
  { href: '/upload',    label: 'Import',        icon: Upload },
]

export default function Navbar({ profile, blockedFeatures = [] }: NavbarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen]           = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [credits, setCredits]     = useState(profile.credit_balance)
  const dropRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setCredits(profile.credit_balance) }, [profile.credit_balance])
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn)
  }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => { document.body.style.overflow = mobileOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [mobileOpen])

  async function signOut() { await supabase.auth.signOut(); router.push('/'); router.refresh() }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const planBadge = PLAN_BADGES[profile.plan_id ?? 'decouverte'] ?? PLAN_BADGES.decouverte

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-[15px] tracking-tight">LeadMaster</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 mx-4 flex-1">
            {NAV.map(l => {
              const Icon = l.icon; const active = isActive(l.href)
              return (
                <Link key={l.href} href={l.href}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                  <Icon className="w-3.5 h-3.5" />{l.label}
                </Link>
              )
            })}
            <Link href="/data-pro"
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                isActive('/data-pro') ? 'bg-amber-50 text-amber-700' : 'text-amber-600 hover:bg-amber-50')}>
              <Crown className="w-3.5 h-3.5" /> DATA Pro
            </Link>
            <Link href="/meetmaster"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-amber-600 hover:bg-amber-50 transition-all">
              <Crown className="w-3.5 h-3.5" /> MeetMaster
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5">Bientôt</span>
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link href="/wallet" className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors rounded-full px-3 py-1.5">
              <span className="text-[10px] text-amber-500">◆</span>
              <span className="text-[14px] font-bold font-mono text-amber-800 tabular-nums">{credits.toLocaleString()}</span>
              <span className="text-[10px] text-amber-500">cr</span>
            </Link>
            <div className="relative" ref={dropRef}>
              <button onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                  {(profile.full_name || profile.email)[0].toUpperCase()}
                </div>
                <span className="text-[12.5px] font-medium text-gray-700 max-w-[100px] truncate">{profile.full_name || profile.email.split('@')[0]}</span>
                <span className={cn('text-[10px] font-semibold border rounded-full px-1.5 py-0', planBadge.color)}>{planBadge.label}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-[12px] font-semibold text-gray-800 truncate">{profile.full_name || '—'}</div>
                    <div className="text-[11.5px] text-gray-400 truncate">{profile.email}</div>
                  </div>
                  <div className="p-1.5">
                    {[
                      { href:'/account',       label:'Mon compte',      icon:Settings },
                      { href:'/wallet',         label:'Mes crédits',     icon:Wallet },
                      { href:'/databases',      label:'Mes recherches',  icon:Database },
                    ].map(item => { const Icon = item.icon; return (
                      <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />{item.label}
                      </Link>
                    )})}
                  </div>
                  <div className="border-t border-gray-100 p-1.5">
                    {profile.is_admin && (
                      <Link href="/admin" onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-indigo-700 hover:bg-indigo-50 font-semibold">
                        🔐 Administration
                      </Link>
                    )}
                    <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 ml-auto">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>
      {mounted && mobileOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative ml-auto w-[280px] h-full bg-white flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="font-bold text-gray-900">LeadMaster</span>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV.map(l => { const Icon = l.icon; return (
                <Link key={l.href} href={l.href}
                  className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium',
                    isActive(l.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50')}>
                  <Icon className="w-4 h-4" />{l.label}
                </Link>
              )})}
              <Link href="/data-pro"
                className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium',
                  isActive('/data-pro') ? 'bg-amber-50 text-amber-700' : 'text-amber-600 hover:bg-amber-50')}>
                <Crown className="w-4 h-4" /> DATA Pro
              </Link>
              <Link href="/meetmaster" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-amber-600 hover:bg-amber-50">
                <Crown className="w-4 h-4" /> MeetMaster <span className="text-[10px] bg-amber-50 border border-amber-200 rounded-full px-1.5 ml-auto">Bientôt</span>
              </Link>
            </nav>
            <div className="p-3 border-t">
              <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
