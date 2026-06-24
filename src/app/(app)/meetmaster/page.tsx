'use client'

import { useState } from 'react'
import { Calendar, Users2, Crown, Star, Clock, MapPin, ArrowRight, Bell } from 'lucide-react'

export default function MeetMasterPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleNotify(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  const features = [
    { icon: '🎯', title: 'Décideurs vérifiés', desc: 'DRH, DAF, Directeurs Achats — des contacts qualifiés et disponibles pour vos rendez-vous.' },
    { icon: '⏱️', title: 'Meetings 30min', desc: '1 000 MAD par session. Planification automatique avec confirmation instantanée.' },
    { icon: '🇲🇦', title: 'Marché marocain', desc: 'Focus sur les entreprises marocaines. Développez votre réseau B2B localement.' },
    { icon: '📊', title: 'Compte-rendu inclus', desc: "Chaque meeting inclut un brief préparatoire et un compte-rendu post-session." },
  ]

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col">
      <div className="max-w-[780px] mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-gold-50 border border-gold-200 text-gold-700 text-[12px] font-bold uppercase tracking-wider rounded-pill px-4 py-2 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500" />
          </span>
          Bientôt disponible
        </div>

        {/* Crown icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-gold-100 to-gold-200 rounded-3xl flex items-center justify-center mb-8 shadow-[0_8px_40px_rgba(217,119,6,0.2)]">
          <Crown className="w-10 h-10 text-gold-600" />
        </div>

        <h1 className="text-[40px] md:text-[52px] font-bold text-ink-1 tracking-tight mb-4 leading-tight">
          MeetMaster arrive<br />
          <span className="text-gold-600">très bientôt</span>
        </h1>

        <p className="text-ink-3 text-[17px] leading-relaxed mb-10 max-w-[520px]">
          La marketplace de meetings B2B au Maroc. Rencontrez des décideurs qualifiés en 48h — DRH, DAF, Directeurs Achats.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-4 mb-12 w-full max-w-[600px]">
          {features.map((f, i) => (
            <div key={i} className="card p-4 text-left">
              <span className="text-2xl mb-2 block">{f.icon}</span>
              <h3 className="font-semibold text-[13.5px] text-ink-1 mb-1">{f.title}</h3>
              <p className="text-[12.5px] text-ink-3 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mb-12">
          {[
            { val: '1 000', unit: 'MAD', label: 'par meeting' },
            { val: '48h',   unit: '',    label: 'confirmation' },
            { val: '30',    unit: 'min', label: 'par session' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-[24px] font-bold text-ink-1 font-mono">
                {s.val}<span className="text-[16px] text-ink-3 font-normal ml-1">{s.unit}</span>
              </div>
              <div className="text-[12px] text-ink-4">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Email notification form */}
        {!submitted ? (
          <form onSubmit={handleNotify} className="flex items-center gap-2 w-full max-w-[420px]">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="input flex-1 py-3 text-[14px]"
            />
            <button type="submit" className="btn-gold flex items-center gap-2 shrink-0 px-5">
              <Bell className="w-4 h-4" /> Me notifier
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-[14px] font-semibold">
            ✓ Vous serez notifié dès le lancement !
          </div>
        )}

        <p className="text-[12px] text-ink-5 mt-3">Aucun spam. Notification unique au lancement.</p>
      </div>
    </div>
  )
}
