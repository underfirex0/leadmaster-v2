import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'LeadMaster — Prospection B2B Maroc',
  description: 'Accédez aux coordonnées de milliers d\'entreprises marocaines vérifiées. Filtrez, déverrouillez, prospectez. 100 crédits offerts à l\'inscription.',
  keywords: ['prospection', 'B2B', 'Maroc', 'données entreprises', 'CRM', 'leads'],
  openGraph: {
    title: 'LeadMaster — Prospection B2B Maroc',
    description: 'La plateforme de revenue intelligence pour le marché marocain.',
    type: 'website',
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 68 40'%3E%3Crect width='68' height='40' rx='20' fill='%236EE7B7'/%3E%3Ccircle cx='48' cy='20' r='17' fill='%230A0A0A'/%3E%3Cpath d='M40 20.5L45 25.5L56 14.5' stroke='%23FFFDF7' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Caveat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
