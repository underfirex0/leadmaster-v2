'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, Database, CreditCard, FileText,
  Upload, Settings, LogOut, Target, Menu, X, Bell, Activity, AlertTriangle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  children: React.ReactNode
  name: string
  email: string
  pendingCount: number
  importsCount: number
}

const NAV_ITEMS = [
  { href:'/admin',                  label:'Dashboard',        icon:LayoutDashboard },
  { href:'/admin/users',            label:'Utilisateurs',     icon:Users },
  { href:'/admin/data',             label:'Base de données',  icon:Database },
  { href:'/admin/subscriptions',    label:'Abonnements',      icon:CreditCard },
  { href:'/admin/invoices',         label:'Factures',         icon:FileText },
  { href:'/admin/data-requests',    label:'Imports clients',  icon:Upload },
  { href:'/admin/analytics',        label:'Analytics',        icon:Activity },
  { href:'/admin/signalements',     label:'Signalements',     icon:AlertTriangle },
]

export default function AdminShell({ children, name, email, pendingCount, importsCount }: AdminShellProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const totalPending = pendingCount + importsCount

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn('flex flex-col h-full', mobile ? 'bg-white' : 'bg-gray-900')}>
      {/* Logo */}
      <div className={cn('px-5 py-5 border-b', mobile ? 'border-gray-100' : 'border-white/10')}>
        <Link href="/admin" className="flex items-center gap-2.5">
          <Logo markSize={26} wordmarkClassName={cn(mobile ? 'text-gray-900' : 'text-white', 'text-[14px]')} />
        </Link>
        <span className={cn('text-[10px] font-medium mt-1 block', mobile ? 'text-gray-400' : 'text-gray-400')}>Administration</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const isPending = (href.includes('subscriptions') && pendingCount > 0) || (href.includes('data-requests') && importsCount > 0)
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all group',
                active
                  ? mobile ? 'bg-indigo-50 text-indigo-700' : 'bg-white/10 text-white'
                  : mobile ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white')}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isPending && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {href.includes('subscriptions') ? pendingCount : importsCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn('p-3 border-t', mobile ? 'border-gray-100' : 'border-white/10')}>
        <Link href="/dashboard"
          className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-colors mb-1',
            mobile ? 'text-gray-500 hover:bg-gray-50' : 'text-gray-400 hover:bg-white/5 hover:text-white')}>
          <Settings className="w-4 h-4" /> App client
        </Link>
        <button onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
        <div className={cn('flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-xl', mobile ? 'bg-gray-50' : 'bg-white/5')}>
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {(name || email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className={cn('text-[12px] font-semibold truncate', mobile ? 'text-gray-800' : 'text-white')}>{name || email}</p>
            <p className="text-[10px] text-gray-400 truncate">{email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 flex-col"><Sidebar /></div>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 px-4 h-14 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo markSize={22} wordmarkClassName="text-white text-[14px]" />
        </Link>
        <div className="flex items-center gap-2">
          {totalPending > 0 && (
            <span className="w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {totalPending}
            </span>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {mounted && mobileOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-72 h-full" onClick={e => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>,
        document.body
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:p-8 pt-14 lg:pt-0">
        <div className="max-w-[1100px] mx-auto px-4 py-6 lg:px-0 lg:py-0">
          {children}
        </div>
      </main>
    </div>
  )
}
