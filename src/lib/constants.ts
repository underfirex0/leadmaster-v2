// ── New Credit Model ──────────────────────────────────────────
// Basic package = 6 fields for 1 cr/company (always included when unlocking)
// Free trial = first 100 companies with BASIC ONLY = free

export const FIELD_GROUPS = {
  basic: {
    id: 'basic',
    label: 'Profil de base',
    cost: 1,
    columns: ['name','city','primary_sector','primary_activite','activities','forme_juridique','facebook','instagram','linkedin','youtube'],
    description: 'Raison sociale · Ville · Secteur · Activités · Forme juridique · Réseaux sociaux',
    icon: '🏢',
    required: true, // Always charged on first unlock of a company
  },
  phone: {
    id: 'phone', label: 'Téléphone', cost: 1,
    columns: ['phone_1','phone_2'],
    description: 'Téléphone fixe + mobile', icon: '📞',
  },
  email: {
    id: 'email', label: 'E-mail', cost: 1,
    columns: ['email'],
    description: 'Adresse email professionnelle', icon: '✉️',
  },
  address: {
    id: 'address', label: 'Adresse complète', cost: 1,
    columns: ['address_raw','latitude','longitude'],
    description: 'Adresse + coordonnées GPS', icon: '📍',
  },
  website: {
    id: 'website', label: 'Site web', cost: 1,
    columns: ['website'],
    description: 'URL du site internet', icon: '🌐',
  },
  ice: {
    id: 'ice', label: 'ICE', cost: 2,
    columns: ['ice','rc'],
    description: 'Identifiant fiscal + RC', icon: '🏛️',
  },
  annee_creation: {
    id: 'annee_creation', label: 'Année création', cost: 2,
    columns: ['annee_creation'],
    description: 'Année de création de la société', icon: '📅',
  },
  director: {
    id: 'director', label: 'Nom dirigeant', cost: 2,
    columns: ['director'],
    description: 'Nom du gérant / dirigeant', icon: '👤',
  },
  capital: {
    id: 'capital', label: 'Capital social', cost: 5,
    columns: ['capital'],
    description: 'Montant du capital social', icon: '💰',
  },
} as const

export type FieldGroupId = keyof typeof FIELD_GROUPS

export const FIELD_COST = (id: FieldGroupId): number => FIELD_GROUPS[id]?.cost ?? 0

// Columns always visible in search preview (free browse — no unlock needed)
export const PREVIEW_COLUMNS = ['name','city']

// Free trial: first 100 companies with basic only = free
export const FREE_TRIAL_LIMIT = 100
export const FREE_TRIAL_FIELDS = ['basic'] as FieldGroupId[]

// ── Plans ────────────────────────────────────────────────────
export const PLANS = {
  decouverte: { id:'decouverte', name:'Découverte', price:0,   credits:100,  desc:'Essai gratuit' },
  solo:       { id:'solo',       name:'Solo',        price:149, credits:400,  desc:'Indépendant' },
  equipe:     { id:'equipe',     name:'Équipe',      price:390, credits:1500, desc:'Jusqu\'à 3 users' },
  business:   { id:'business',   name:'Business',    price:990, credits:5000, desc:'Jusqu\'à 10 users' },
  entreprise: { id:'entreprise', name:'Entreprise',  price:0,   credits:null, desc:'Sur mesure' },
}

export const CREDIT_PACKS = [
  { id:'boost',     name:'Pack Boost',     credits:500,   price:99   },
  { id:'essential', name:'Pack Essential', credits:2000,  price:349  },
  { id:'growth',    name:'Pack Growth',    credits:5000,  price:799  },
  { id:'pro',       name:'Pack Pro',       credits:15000, price:1990 },
]

// Legacy
export const FIELD_COSTS: Record<string, number> = {
  basic:1, phone:1, email:1, address:1, website:1, ice:2, annee_creation:2, director:2, capital:5,
}
export const FREE_FIELDS: string[] = []

// ── Legacy exports (used by old API routes) ───────────────────
export const PAGE_SIZE = 30
export const MAX_RESULTS = 500
export const UNLOCK_COST_PER_COMPANY = 1
