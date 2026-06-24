'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Download, Users2, Phone, Mail, Globe, User, Building2, MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Company = Record<string, string | null>

const FIELD_COLUMNS: Record<string, string[]> = {
  phone: ['phone_1','phone_2'], email: ['email'], website: ['website'],
  director: ['director'], legal: ['ice','rc','capital','forme_juridique'],
  address: ['address_raw'], social: ['facebook','instagram','linkedin','youtube'],
}
const FIELD_LABELS: Record<string, string> = {
  phone:'Téléphone', email:'E-mail', website:'Site web', director:'Dirigeant',
  legal:'ICE + RC', address:'Adresse', social:'Réseaux',
}

export default function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [data, setData]     = useState<{ query: Record<string,unknown>; companies: Company[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [injecting, setInjecting] = useState(false)
  const [toast, setToast]   = useState<string|null>(null)

  useEffect(() => {
    fetch(`/api/searches/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [id])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function handleInjectAll() {
    if (!data?.companies.length) return
    setInjecting(true)
    const r = await fetch('/api/my-data/inject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_ids: data.companies.map((c) => c.id) }),
    })
    const d = await r.json()
    showToast(d.message || 'Injecté dans le CRM')
    setInjecting(false)
  }

  async function handleCSV() {
    const r = await fetch(`/api/export?queryId=${id}`)
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leadmaster-${id.slice(0,8)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin" /></div>
  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Recherche introuvable</div>

  const fields = (data.query.fields_requested as string[]) ?? []
  const companies = data.companies as Company[]

  function initials(name: string) { return (name || '?').split(/\s+/).slice(0,2).map((w:string) => w[0]).join('').toUpperCase() }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl text-[13px] font-semibold shadow-xl">{toast}</div>}
      <div className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <Link href="/databases" className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600 mb-3">
              <ChevronLeft className="w-4 h-4" /> Mes recherches
            </Link>
            <h1 className="text-[24px] font-bold text-gray-900">{companies.length} entreprises déverrouillées</h1>
            <p className="text-gray-400 text-[13px] mt-0.5">Champs : {fields.map(f => FIELD_LABELS[f]??f).join(', ')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCSV} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 border border-gray-200 bg-white rounded-xl px-4 py-2.5 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
            <button onClick={handleInjectAll} disabled={injecting} className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-indigo-600 rounded-xl px-4 py-2.5 hover:bg-indigo-700 shadow-md shadow-indigo-100">
              {injecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />}
              Tout injecter → CRM
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {companies.map((c, i) => (
            <div key={c.id ?? i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[12px] flex items-center justify-center shrink-0">
                  {initials(c.name ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-[14.5px] text-gray-900">{c.name || '—'}</h3>
                      <div className="flex items-center gap-2 text-[12px] text-gray-400 mt-0.5">
                        {c.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                        {c.primary_sector && <span className="text-gray-400">· {c.primary_sector}</span>}
                        {c.annee_creation && <span className="text-gray-400">· {c.annee_creation}</span>}
                      </div>
                    </div>
                    {Array.isArray(c.activities) && (c.activities as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(c.activities as string[]).slice(0,2).map((a,j) => (
                          <span key={j} className="text-[10.5px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                    {fields.includes('phone') && (c.phone_1 || c.phone_2) && (
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <Phone className="w-3 h-3 text-indigo-400 shrink-0" />
                        <a href={`tel:${c.phone_1 ?? c.phone_2}`} className="font-mono text-gray-700 hover:text-indigo-600">{c.phone_1 ?? c.phone_2}</a>
                      </div>
                    )}
                    {fields.includes('email') && c.email && (
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                        <a href={`mailto:${c.email}`} className="text-gray-700 truncate hover:text-indigo-600">{c.email}</a>
                      </div>
                    )}
                    {fields.includes('website') && c.website && (
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 truncate hover:underline">{c.website.replace(/^https?:\/\//,'')}</a>
                      </div>
                    )}
                    {fields.includes('director') && c.director && (
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <User className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-gray-700">{c.director}</span>
                      </div>
                    )}
                    {fields.includes('legal') && c.ice && (
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="font-mono text-gray-500">ICE: {c.ice}</span>
                      </div>
                    )}
                    {fields.includes('address') && c.address_raw && (
                      <div className="flex items-center gap-1.5 text-[12.5px] col-span-2">
                        <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-gray-500 truncate">{c.address_raw}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
