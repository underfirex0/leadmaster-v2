'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Phone, Mail, Globe, User, Building2, MapPin, Lock, Unlock,
  ChevronLeft, ChevronRight, Users2, Search,
  Star, CheckSquare, Square, ExternalLink, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyPreview, Company } from '@/types'
import { createClient } from '@/lib/supabase/client'

// ── Company Card ─────────────────────────────────────────────
type CardState = 'locked' | 'unlocking' | 'unlocked'

function CompanyCard({
  company,
  selected,
  onSelect,
  onUnlock,
  isUnlocking,
}: {
  company: CompanyPreview & { is_unlocked?: boolean; full?: Company }
  selected: boolean
  onSelect: (id: string) => void
  onUnlock: (id: string) => void
  isUnlocking: boolean
}) {
  const state: CardState = company.is_unlocked ? 'unlocked' : 'locked'
  const full = company.full

  function initials(name: string) {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  return (
    <div className={cn(
      'card p-4 transition-all duration-200 group',
      selected && 'ring-2 ring-brand-500 border-transparent',
      state === 'unlocked' && 'border-emerald-200 bg-emerald-50/30',
    )}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(company.id)}
          className={cn(
            'mt-0.5 shrink-0 transition-colors',
            selected ? 'text-brand-600' : 'text-ink-5 hover:text-ink-3'
          )}
        >
          {selected
            ? <CheckSquare className="w-4 h-4" />
            : <Square className="w-4 h-4" />}
        </button>

        {/* Logo / Initials */}
        <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-[11px] font-bold text-brand-700 shrink-0 overflow-hidden border border-brand-200">
          {company.logo_url
            ? <img src={company.logo_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : initials(company.name)
          }
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <h3 className="font-semibold text-[14px] text-ink-1 leading-tight truncate">{company.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-ink-3 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-ink-4 shrink-0" />{company.city ?? '—'}
                </span>
                {company.annee_creation && (
                  <span className="text-[11px] text-ink-4 border-l border-[rgba(0,0,0,0.08)] pl-2">Créé {company.annee_creation}</span>
                )}
                {company.forme_juridique && (
                  <span className="text-[11px] text-ink-4 border-l border-[rgba(0,0,0,0.08)] pl-2">{company.forme_juridique}</span>
                )}
              </div>
            </div>
            {/* Status badge */}
            {state === 'unlocked'
              ? <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 rounded-pill px-2 py-0.5 border border-emerald-200">
                  <Unlock className="w-3 h-3" /> Déverrouillé
                </span>
              : company.is_recommended && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-gold-700 bg-gold-50 rounded-pill px-2 py-0.5 border border-gold-200">
                  <Star className="w-2.5 h-2.5" /> Recommandé
                </span>
              )
            }
          </div>

          {/* Activities tags */}
          {Array.isArray(company.activities) && company.activities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {company.activities.slice(0, 3).map((act: string, i: number) => (
                <span key={i} className="text-[11px] bg-surface-2 border border-[rgba(0,0,0,0.07)] text-ink-3 rounded-pill px-2 py-0.5">
                  {act}
                </span>
              ))}
              {company.activities.length > 3 && (
                <span className="text-[11px] text-ink-4">+{company.activities.length - 3}</span>
              )}
            </div>
          )}

          {/* Locked data preview OR Unlocked data */}
          {state === 'locked' ? (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-ink-4 bg-surface-2 border border-[rgba(0,0,0,0.07)] rounded-lg px-2.5 py-1.5">
                <Lock className="w-3 h-3" /> Téléphone masqué
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-4 bg-surface-2 border border-[rgba(0,0,0,0.07)] rounded-lg px-2.5 py-1.5">
                <Lock className="w-3 h-3" /> Email masqué
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-4 bg-surface-2 border border-[rgba(0,0,0,0.07)] rounded-lg px-2.5 py-1.5">
                <Lock className="w-3 h-3" /> Dirigeant masqué
              </div>
              <button
                onClick={() => onUnlock(company.id)}
                disabled={isUnlocking}
                className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
              >
                {isUnlocking
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Unlock className="w-3 h-3" />
                }
                {isUnlocking ? 'Déverrouillage…' : <>Débloquer <span className="text-[11px] text-brand-400">1 cr</span></>}
              </button>
            </div>
          ) : full ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {full.phone_1 && (
                <a href={`tel:${full.phone_1}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand-700 transition-colors">
                  <Phone className="w-3 h-3 text-brand-500 shrink-0" />
                  <span className="font-mono truncate">{full.phone_1}</span>
                </a>
              )}
              {full.email && (
                <a href={`mailto:${full.email}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand-700 transition-colors">
                  <Mail className="w-3 h-3 text-brand-500 shrink-0" />
                  <span className="truncate">{full.email}</span>
                </a>
              )}
              {full.director && (
                <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                  <User className="w-3 h-3 text-brand-500 shrink-0" />
                  <span className="truncate">{full.director}</span>
                </div>
              )}
              {full.website && (
                <a href={full.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12.5px] text-brand-600 hover:underline transition-colors">
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="truncate">{full.website.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50" />
                </a>
              )}
              {full.ice && (
                <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Building2 className="w-3 h-3 text-ink-4 shrink-0" />
                  <span className="font-mono">ICE: {full.ice}</span>
                </div>
              )}
              {full.address_raw && (
                <div className="flex items-center gap-1.5 text-[12px] text-ink-3 col-span-2">
                  <MapPin className="w-3 h-3 text-ink-4 shrink-0" />
                  <span className="truncate">{full.address_raw}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 text-[12px] text-emerald-600">
              <Unlock className="w-3 h-3" /> Données disponibles dans &quot;Mes Données&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Results Page Inner ───────────────────────────────────────
function ResultsInner() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const rubSlugs = (searchParams.get('activites') ?? '').split(',').filter(Boolean)
  const cities      = (searchParams.get('cities') ?? '').split(',').filter(Boolean)
  const name        = searchParams.get('name') ?? ''

  const [companies, setCompanies]   = useState<(CompanyPreview & { is_unlocked?: boolean; full?: Company })[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage]             = useState(1)
  const [hasMore, setHasMore]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [unlocking, setUnlocking]   = useState<Set<string>>(new Set())
  const [bulkUnlocking, setBulkUnlocking] = useState(false)
  const [addingToCRM, setAddingToCRM] = useState(false)
  const [balance, setBalance]       = useState<number | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'success'|'error' } | null>(null)

  // Fetch balance
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      fetch('/api/me/balance').then(r => r.json()).then(d => setBalance(d.balance))
    })
  }, [])

  const fetchResults = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activites: rubSlugs, cities, name, page: p, limit: 30 }),
      })
      const data = await r.json()
      if (p === 1) setCompanies(data.companies ?? [])
      else setCompanies(prev => [...prev, ...(data.companies ?? [])])
      setTotalCount(data.totalCount ?? 0)
      setHasMore(data.hasMore ?? false)
    } finally {
      setLoading(false)
    }
  }, [rubSlugs.join(','), cities.join(','), name])

  useEffect(() => { fetchResults(1) }, [fetchResults])

  function showToast(msg: string, type: 'success'|'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === companies.length) setSelected(new Set())
    else setSelected(new Set(companies.map(c => c.id)))
  }

  async function unlock(ids: string[]) {
    const toUnlock = ids.filter(id => {
      const c = companies.find(x => x.id === id)
      return c && !c.is_unlocked
    })
    if (!toUnlock.length) { showToast('Ces entreprises sont déjà déverrouillées', 'success'); return }

    // Mark as unlocking
    setUnlocking(prev => new Set([...prev, ...toUnlock]))
    try {
      const r = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_ids: toUnlock }),
      })
      const data = await r.json()
      if (!r.ok) { showToast(data.error || 'Erreur déverrouillage', 'error'); return }

      setBalance(data.newBalance)

      // Update company cards with full data
      const fullMap: Record<string, Company> = {}
      for (const c of data.companies ?? []) fullMap[c.id] = c

      setCompanies(prev => prev.map(c => {
        if (toUnlock.includes(c.id) || c.is_unlocked) {
          return { ...c, is_unlocked: true, full: fullMap[c.id] ?? c.full }
        }
        return c
      }))

      const msg = data.newlyUnlocked === 0
        ? `${data.alreadyUnlocked} entreprise${data.alreadyUnlocked > 1 ? 's' : ''} déjà déverrouillée${data.alreadyUnlocked > 1 ? 's' : ''}`
        : `🔓 ${data.newlyUnlocked} entreprise${data.newlyUnlocked > 1 ? 's' : ''} déverrouillée${data.newlyUnlocked > 1 ? 's' : ''} (${data.creditsSpent} cr)`
      showToast(msg, 'success')
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setUnlocking(prev => { const n = new Set(prev); toUnlock.forEach(id => n.delete(id)); return n })
    }
  }

  async function handleBulkUnlock() {
    setBulkUnlocking(true)
    await unlock([...selected])
    setSelected(new Set())
    setBulkUnlocking(false)
  }

  async function addToCRM(ids: string[]) {
    if (!ids.length) return
    setAddingToCRM(true)
    try {
      const r = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessIds: ids }),
      })
      const data = await r.json()
      if (!r.ok) { showToast(data.error || 'Erreur CRM', 'error'); return }
      showToast(`${data.added} lead${data.added !== 1 ? 's' : ''} ajouté${data.added !== 1 ? 's' : ''} au CRM`, 'success')
      setSelected(new Set())
    } catch {
      showToast('Erreur réseau', 'error')
    } finally {
      setAddingToCRM(false)
    }
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    fetchResults(next)
  }

  const unlockedCount = companies.filter(c => c.is_unlocked).length
  const lockedCount   = companies.filter(c => !c.is_unlocked).length
  const selectedLocked = [...selected].filter(id => !companies.find(c => c.id === id)?.is_unlocked).length

  return (
    <div className="min-h-screen bg-surface-1">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-floating text-[13px] font-medium animate-scale-in',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/search" className="inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink-2 transition-colors mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Retour à la recherche
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[22px] font-bold text-ink-1 tracking-tight">
                {loading && companies.length === 0 ? 'Chargement...' : (
                  <>{totalCount.toLocaleString('fr-MA')} entreprise{totalCount !== 1 ? 's' : ''} trouvée{totalCount !== 1 ? 's' : ''}</>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-ink-3 flex-wrap">
                {rubSlugs.length > 0 && <span className="flex items-center gap-1"><Search className="w-3 h-3" />{rubSlugs.length} activité{rubSlugs.length > 1 ? 's' : ''}</span>}
                {cities.length > 0 && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cities.join(', ')}</span>}
                {name && <span className="flex items-center gap-1"><Search className="w-3 h-3" />"{name}"</span>}
                {unlockedCount > 0 && <span className="text-emerald-600 font-semibold flex items-center gap-1"><Unlock className="w-3 h-3" />{unlockedCount} déverrouillée{unlockedCount > 1 ? 's' : ''}</span>}
              </div>
            </div>

            {/* Credit balance */}
            {balance !== null && (
              <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-xl px-3.5 py-2 shrink-0">
                <span className="text-[11px] text-gold-600">◆</span>
                <span className="text-[15px] font-bold font-mono text-gold-800">{balance.toLocaleString()}</span>
                <span className="text-[11px] text-gold-500">crédits</span>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {companies.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-[rgba(0,0,0,0.07)] shadow-[var(--sh-xs)] flex-wrap">
            {/* Select all */}
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink-1 transition-colors font-medium"
            >
              {selected.size === companies.length && companies.length > 0
                ? <CheckSquare className="w-4 h-4 text-brand-600" />
                : <Square className="w-4 h-4 text-ink-4" />}
              {selected.size === companies.length && companies.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>

            {selected.size > 0 && (
              <>
                <div className="h-4 w-px bg-[rgba(0,0,0,0.08)]" />
                <span className="text-[13px] text-ink-3">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
                <div className="ml-auto flex items-center gap-2">
                  {selectedLocked > 0 && (
                    <button
                      onClick={handleBulkUnlock}
                      disabled={bulkUnlocking}
                      className="btn-brand btn-sm"
                    >
                      {bulkUnlocking
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Déverrouillage...</>
                        : <><Unlock className="w-3.5 h-3.5" /> Débloquer {selectedLocked} ({selectedLocked} cr)</>
                      }
                    </button>
                  )}
                  <button
                    onClick={() => addToCRM([...selected])}
                    disabled={addingToCRM}
                    className="btn-ghost btn-sm flex items-center gap-1.5"
                  >
                    {addingToCRM
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ajout...</>
                      : <><Users2 className="w-3.5 h-3.5" /> Ajouter au CRM</>
                    }
                  </button>
                </div>
              </>
            )}

            {/* Unlock all visible */}
            {lockedCount > 0 && selected.size === 0 && (
              <button
                onClick={() => unlock(companies.filter(c => !c.is_unlocked).map(c => c.id))}
                disabled={unlocking.size > 0}
                className="btn-brand btn-sm ml-auto"
              >
                <Unlock className="w-3.5 h-3.5" />
                Tout débloquer ({lockedCount} cr)
              </button>
            )}
          </div>
        )}

        {/* Results Grid */}
        {loading && companies.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 h-24 skeleton" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="card p-12 text-center">
            <Search className="w-10 h-10 text-ink-5 mx-auto mb-3" />
            <h3 className="font-semibold text-ink-2 mb-1.5">Aucun résultat</h3>
            <p className="text-ink-4 text-[13.5px] mb-4">Aucune entreprise ne correspond à vos critères.</p>
            <Link href="/search" className="btn-brand btn-sm inline-flex">
              <ChevronLeft className="w-3.5 h-3.5" /> Modifier la recherche
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {companies.map(c => (
                <CompanyCard
                  key={c.id}
                  company={c}
                  selected={selected.has(c.id)}
                  onSelect={toggleSelect}
                  onUnlock={id => unlock([id])}
                  isUnlocking={unlocking.has(c.id)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-ghost px-8"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</>
                    : <>Charger plus <ChevronRight className="w-4 h-4" /></>
                  }
                </button>
                <p className="text-[12px] text-ink-4 mt-2">{companies.length} / {totalCount.toLocaleString('fr-MA')} entreprises affichées</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    }>
      <ResultsInner />
    </Suspense>
  )
}
