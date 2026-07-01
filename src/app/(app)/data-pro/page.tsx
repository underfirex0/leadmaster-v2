'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Crown, ArrowRight, Database, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Dataset = {
  id: string; name: string; description: string | null; sector_tag: string | null
  credit_cost: number; record_count: number; cover_emoji: string | null
  created_at: string; is_unlocked: boolean
}

export default function DataProPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/data-pro').then(r => r.json()).then(d => { setDatasets(d.datasets ?? []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">DATA Pro</h1>
            <p className="text-gray-500 text-[14px]">Datasets premium, enrichis à la main, prêts à l&apos;emploi — un seul paiement pour tout débloquer.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>
        ) : datasets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center mt-8">
            <Crown className="w-12 h-12 text-amber-200 mx-auto mb-4" />
            <h3 className="font-bold text-gray-700 text-[17px] mb-2">Aucun dataset disponible pour le moment</h3>
            <p className="text-gray-400 text-[14px]">De nouveaux datasets premium arrivent bientôt.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            {datasets.map(d => (
              <Link key={d.id} href={`/data-pro/${d.id}`}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-lg',
                  d.is_unlocked
                    ? 'bg-white border-emerald-200 hover:shadow-emerald-100'
                    : 'bg-gradient-to-br from-white to-amber-50/40 border-amber-200 hover:shadow-amber-100'
                )}
              >
                {!d.is_unlocked && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> PREMIUM
                  </span>
                )}
                {d.is_unlocked && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    ✓ Débloqué
                  </span>
                )}
                <div className="text-[32px] mb-3">{d.cover_emoji || '💎'}</div>
                <h3 className="font-bold text-[17px] text-gray-900 mb-1 pr-20">{d.name}</h3>
                {d.description && <p className="text-[13px] text-gray-500 mb-3 line-clamp-2">{d.description}</p>}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {d.sector_tag && (
                    <span className="text-[11.5px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-0.5">{d.sector_tag}</span>
                  )}
                  <span className="flex items-center gap-1 text-[11.5px] text-gray-400">
                    <Database className="w-3 h-3" />{d.record_count.toLocaleString('fr-FR')} entreprises
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn('text-[15px] font-bold', d.is_unlocked ? 'text-emerald-600' : 'text-amber-700')}>
                    {d.is_unlocked ? 'Accéder aux données' : `${d.credit_cost.toLocaleString('fr-FR')} cr`}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
