import Link from 'next/link'
import { Shield, Lock, Eye, Trash2, Mail, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Protection des données — LeadMaster',
  description: 'Politique de protection des données personnelles de LeadMaster.',
}

export default function ProtectionDesdonneesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.06)]">
        <div className="max-w-[860px] mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[15px] text-[#0C0C0C] tracking-tight">LeadMaster</span>
          </Link>
          <span className="text-[rgba(0,0,0,0.15)]">/</span>
          <span className="text-[14px] text-[#6B6B6B]">Protection des données</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[860px] mx-auto px-5 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#6B6B6B] hover:text-[#0C0C0C] transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour à l&apos;accueil
        </Link>

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-pill px-4 py-2 mb-5">
            <Shield className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span className="text-[12px] font-semibold text-[#4F46E5]">Politique de protection des données</span>
          </div>
          <h1 className="text-[36px] font-extrabold text-[#0C0C0C] mb-3" style={{ letterSpacing: '-1.5px' }}>
            Vos données, votre contrôle.
          </h1>
          <p className="text-[16px] text-[#6B6B6B] leading-relaxed max-w-[560px]">
            LeadMaster s&apos;engage à protéger la vie privée de ses utilisateurs. Ce document explique quelles données nous collectons, pourquoi, et comment vous pouvez les contrôler.
          </p>
          <p className="text-[13px] text-[#A0A0A0] mt-3">
            Dernière mise à jour : Juin 2026
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Lock,  title: 'Données sécurisées', body: 'Toutes vos données sont stockées sur Supabase avec chiffrement au repos et en transit.' },
            { icon: Eye,   title: 'Pas de revente',     body: 'Nous ne vendons, ne louons ni ne partageons vos données personnelles avec des tiers à des fins commerciales.' },
            { icon: Trash2,title: 'Droit à l\'effacement', body: 'Vous pouvez demander la suppression de votre compte et de toutes vos données à tout moment.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5">
              <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <p className="font-semibold text-[13px] text-[#0C0C0C] mb-1">{title}</p>
              <p className="text-[12.5px] text-[#6B6B6B] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] divide-y divide-[rgba(0,0,0,0.05)] overflow-hidden">

          {/* 1 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              1. Qui sommes-nous ?
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              LeadMaster est une plateforme de prospection B2B destinée au marché marocain. Le responsable du traitement des données est l&apos;éditeur de la plateforme, joignable à l&apos;adresse <a href="mailto:contact@leadmaster.ma" className="text-[#4F46E5] underline underline-offset-2">contact@leadmaster.ma</a>.
            </p>
          </div>

          {/* 2 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              2. Données que nous collectons
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Données de compte', detail: 'Nom, adresse e-mail, mot de passe (haché), numéro de téléphone si fourni.' },
                { label: 'Données d\'usage', detail: 'Recherches effectuées, champs débloqués, leads ajoutés au CRM, historique d\'appels.' },
                { label: 'Données de facturation', detail: 'Plan souscrit, historique de consommation de crédits, factures. Aucune carte bancaire n\'est stockée chez nous.' },
                { label: 'Données techniques', detail: 'Adresse IP, type de navigateur, pages visitées, temps de session — pour des raisons de sécurité et d\'amélioration du service.' },
              ].map(({ label, detail }) => (
                <div key={label} className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mt-[7px] shrink-0" />
                  <div>
                    <p className="text-[14px] font-semibold text-[#0C0C0C] mb-0.5">{label}</p>
                    <p className="text-[13.5px] text-[#6B6B6B] leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              3. Comment nous utilisons vos données
            </h2>
            <div className="space-y-3">
              {[
                'Fournir et améliorer les fonctionnalités de la plateforme (recherche, CRM, export)',
                'Gérer votre compte, votre abonnement et votre solde de crédits',
                'Vous envoyer des notifications liées à votre utilisation (rappels, confirmations)',
                'Prévenir les usages frauduleux et assurer la sécurité de la plateforme',
                'Générer des statistiques anonymisées d\'utilisation pour améliorer le produit',
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-[12px] font-bold text-[#4F46E5] w-5 shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-[13.5px] text-[#6B6B6B] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              4. Partage des données
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4">
              Nous ne vendons jamais vos données personnelles. Nous les partageons uniquement dans les cas suivants :
            </p>
            <div className="space-y-3">
              {[
                { label: 'Supabase (infrastructure)', detail: 'Notre base de données et système d\'authentification. Données hébergées en Europe.' },
                { label: 'Obligation légale', detail: 'Si la loi marocaine nous y oblige, après vérification de la demande.' },
                { label: 'Protection de nos droits', detail: 'En cas de fraude avérée ou d\'utilisation abusive de la plateforme.' },
              ].map(({ label, detail }) => (
                <div key={label} className="bg-[#F7F7F5] rounded-xl p-4">
                  <p className="text-[13px] font-semibold text-[#0C0C0C] mb-0.5">{label}</p>
                  <p className="text-[12.5px] text-[#6B6B6B]">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              5. Conservation des données
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, vos données personnelles sont effacées sous <strong className="text-[#0C0C0C]">30 jours</strong>. Les données de facturation peuvent être conservées jusqu&apos;à 5 ans pour des raisons comptables légales.
            </p>
          </div>

          {/* 6 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              6. Vos droits
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { right: 'Droit d\'accès',       desc: 'Obtenir une copie de toutes vos données.' },
                { right: 'Droit de rectification',desc: 'Corriger des informations inexactes.' },
                { right: 'Droit à l\'effacement', desc: 'Supprimer votre compte et vos données.' },
                { right: 'Droit à la portabilité',desc: 'Recevoir vos données dans un format lisible.' },
                { right: 'Droit d\'opposition',   desc: 'Vous opposer à certains traitements.' },
                { right: 'Droit à la limitation', desc: 'Limiter le traitement dans certains cas.' },
              ].map(({ right, desc }) => (
                <div key={right} className="border border-[rgba(0,0,0,0.06)] rounded-xl p-4">
                  <p className="text-[13px] font-semibold text-[#0C0C0C] mb-0.5">{right}</p>
                  <p className="text-[12.5px] text-[#6B6B6B]">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#3730A3]">
                Pour exercer vos droits, envoyez un e-mail à{' '}
                <a href="mailto:contact@leadmaster.ma" className="font-semibold underline underline-offset-2">contact@leadmaster.ma</a>
                {' '}avec pour objet &quot;Demande RGPD — [votre demande]&quot;. Réponse sous 30 jours.
              </p>
            </div>
          </div>

          {/* 7 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              7. Cookies
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              LeadMaster utilise uniquement des cookies techniques essentiels au fonctionnement de la plateforme (session utilisateur, préférences). Nous n&apos;utilisons pas de cookies publicitaires ou de traçage tiers.
            </p>
          </div>

          {/* 8 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              8. Sécurité
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Vos données sont protégées par chiffrement TLS en transit et AES-256 au repos. L&apos;accès est contrôlé par des politiques de sécurité au niveau base de données (Row Level Security). Les mots de passe ne sont jamais stockés en clair.
            </p>
          </div>

          {/* 9 */}
          <div className="p-7">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-4" style={{ letterSpacing: '-0.3px' }}>
              9. Modifications de cette politique
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              En cas de modification substantielle de cette politique, vous serez informé par e-mail ou par une notification dans l&apos;application au moins 30 jours avant l&apos;entrée en vigueur des changements.
            </p>
          </div>

          {/* Contact */}
          <div className="p-7 bg-[#F7F7F5]">
            <h2 className="text-[17px] font-bold text-[#0C0C0C] mb-2" style={{ letterSpacing: '-0.3px' }}>
              Contact
            </h2>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-3">
              Pour toute question relative à la protection de vos données :
            </p>
            <a href="mailto:contact@leadmaster.ma"
              className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-[#4338CA] transition-colors">
              <Mail className="w-4 h-4" /> contact@leadmaster.ma
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[12px] text-[#A0A0A0] text-center mt-8">
          © {new Date().getFullYear()} LeadMaster · Casablanca, Maroc ·{' '}
          <Link href="/" className="hover:text-[#6B6B6B] transition-colors">Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  )
}
