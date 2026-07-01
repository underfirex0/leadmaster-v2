'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Crown, Plus, Upload, Loader2, Trash2, Eye, EyeOff, X, Database, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Dataset = {
  id: string; name: string; description: string | null; sector_tag: string | null
  credit_cost: number; record_count: number; cover_emoji: string | null
  is_active: boolean; purchases: number; created_at: string
  field_schema: { key: string; label: string; type: string }[]
}

const EMOJIS = ['💎','🏗️','🏭','🏨','🍽️','💳','⚕️','🏢','🌾','⚡','🚗','🎓']

export default function AdminDataProPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', sector_tag: '', credit_cost: 2000, cover_emoji: '💎' })
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/datasets')
    const d = await r.json()
    setDatasets(d.datasets ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  async function handleCreate() {
    if (!form.name.trim()) return
    setCreating(true)
    const r = await fetch('/api/admin/datasets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const d = await r.json()
    setCreating(false)
    if (!r.ok) { showToast(d.error || 'Erreur création'); return }
    setShowCreate(false)
    setForm({ name: '', description: '', sector_tag: '', credit_cost: 2000, cover_emoji: '💎' })
    showToast('Dataset créé ✓')
    load()
  }

  async function handleToggleActive(ds: Dataset) {
    await fetch(`/api/admin/datasets/${ds.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !ds.is_active }),
    })
    load()
  }

  async function handleDelete(ds: Dataset) {
    if (!confirm(`Supprimer "${ds.name}" et toutes ses ${ds.record_count} fiches ? Cette action est irréversible.`)) return
    await fetch(`/api/admin/datasets/${ds.id}`, { method: 'DELETE' })
    showToast('Dataset supprimé')
    load()
  }

  async function handleFileUpload(ds: Dataset, file: File) {
    setUploadingId(ds.id)
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(`/api/admin/datasets/${ds.id}/upload`, { method: 'POST', body: fd })
    const d = await r.json()
    setUploadingId(null)
    if (!r.ok) { showToast(d.error || 'Erreur import'); return }
    showToast(`${d.inserted} fiches importées ✓ (${d.mapped_standard} champs standards, ${d.mapped_extra} champs custom détectés)`)
    load()
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink-1 text-white px-4 py-3 rounded-xl text-[13px] font-medium shadow-xl max-w-md">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-1 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" /> DATA Pro
          </h1>
          <p className="text-ink-4 text-[13.5px] mt-0.5">Datasets premium curés — upload CSV/XLSX, tarification à plat, badge or.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 !py-2.5 !px-4">
          <Plus className="w-4 h-4" /> Nouveau dataset
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-brand-600 animate-spin" /></div>
      ) : datasets.length === 0 ? (
        <div className="card p-12 text-center">
          <Database className="w-10 h-10 text-ink-5 mx-auto mb-3" />
          <p className="text-ink-3 text-[14px]">Aucun dataset pour le moment. Créez-en un pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {datasets.map(ds => (
            <div key={ds.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                  <div className="text-[28px] shrink-0">{ds.cover_emoji || '💎'}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[15px] text-ink-1">{ds.name}</h3>
                      {ds.is_active ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Actif</span>
                      ) : (
                        <span className="text-[10px] font-bold text-ink-4 bg-surface-2 border border-[rgba(0,0,0,0.07)] rounded-full px-2 py-0.5">Désactivé</span>
                      )}
                      {ds.sector_tag && (
                        <span className="text-[10px] font-semibold text-ink-3 bg-surface-2 rounded-full px-2 py-0.5">{ds.sector_tag}</span>
                      )}
                    </div>
                    {ds.description && <p className="text-[12.5px] text-ink-4 mt-1 max-w-md">{ds.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[12px] text-ink-4">
                      <span>{ds.record_count.toLocaleString('fr-FR')} fiches</span>
                      <span>·</span>
                      <span className="font-semibold text-amber-700">{ds.credit_cost.toLocaleString('fr-FR')} cr</span>
                      <span>·</span>
                      <span>{ds.purchases} achat{ds.purchases !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{ds.field_schema?.length ?? 0} champ{(ds.field_schema?.length ?? 0) !== 1 ? 's' : ''} custom</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={el => { fileInputs.current[ds.id] = el }}
                    type="file" accept=".csv,.xlsx,.xls" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(ds, f); e.target.value = '' }}
                  />
                  <button
                    onClick={() => fileInputs.current[ds.id]?.click()}
                    disabled={uploadingId === ds.id}
                    className="btn-ghost btn-sm flex items-center gap-1.5 !py-2 !px-3"
                  >
                    {uploadingId === ds.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Importer CSV/XLSX
                  </button>
                  <button onClick={() => handleToggleActive(ds)} className="btn-ghost btn-sm !py-2 !px-2.5" title={ds.is_active ? 'Désactiver' : 'Activer'}>
                    {ds.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(ds)} className="btn-ghost btn-sm !py-2 !px-2.5 text-red-500 hover:text-red-600" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {ds.field_schema?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[rgba(0,0,0,0.05)]">
                  {ds.field_schema.map(f => (
                    <span key={f.key} className="text-[10.5px] text-ink-4 bg-surface-2 rounded-full px-2 py-0.5">{f.label}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[17px] text-ink-1">Nouveau dataset Pro</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-4.5 h-4.5 text-ink-4" /></button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[12px] font-semibold text-ink-4 block mb-1">Icône</label>
                <div className="flex gap-1.5 flex-wrap">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, cover_emoji: e }))}
                      className={cn('w-9 h-9 rounded-lg text-[18px] flex items-center justify-center border transition-all',
                        form.cover_emoji === e ? 'border-brand-500 bg-brand-50' : 'border-[rgba(0,0,0,0.08)] hover:bg-surface-2')}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-ink-4 block mb-1">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Top 500 Maroc" className="input w-full" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-ink-4 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Les 500 plus grandes entreprises marocaines, dirigeants + contacts directs"
                  className="input w-full min-h-[70px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-ink-4 block mb-1">Secteur</label>
                  <input value={form.sector_tag} onChange={e => setForm(f => ({ ...f, sector_tag: e.target.value }))}
                    placeholder="BTP, Industrie..." className="input w-full" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-ink-4 block mb-1">Coût (crédits)</label>
                  <input type="number" value={form.credit_cost} onChange={e => setForm(f => ({ ...f, credit_cost: Number(e.target.value) }))}
                    className="input w-full" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Annuler</button>
              <button onClick={handleCreate} disabled={creating || !form.name.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Créer
              </button>
            </div>
            <p className="text-[11.5px] text-ink-4 mt-3">Une fois créé, importez un fichier CSV/XLSX depuis la liste. Les colonnes reconnues (nom, ville, téléphone, email, dirigeant...) se mappent automatiquement ; les autres deviennent des champs custom affichés dynamiquement.</p>
          </div>
        </div>
      )}
    </div>
  )
}
