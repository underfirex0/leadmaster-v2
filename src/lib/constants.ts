// ── Company field costs ──────────────────────────────────────────
// 1 credit = unlock ALL data for a company (simplified model)
export const UNLOCK_COST_PER_COMPANY = 1

// Free fields (always visible in search results)
export const FREE_COMPANY_FIELDS = [
  'id', 'name', 'city', 'activities', 'annee_creation',
  'forme_juridique', 'logo_url', 'rating', 'review_count', 'is_recommended'
]

// Premium fields (visible after unlock)
export const PREMIUM_COMPANY_FIELDS = [
  'phone_1', 'phone_2', 'phones',
  'email', 'website',
  'director', 'ice', 'rc', 'capital',
  'address_raw', 'latitude', 'longitude',
  'facebook', 'instagram', 'linkedin', 'youtube',
  'description', 'source_url'
]

export const FIELD_LABELS: Record<string, string> = {
  name: 'Raison sociale',
  city: 'Ville',
  activities: 'Activités',
  annee_creation: 'Année création',
  forme_juridique: 'Forme juridique',
  rating: 'Note',
  review_count: 'Avis',
  phone_1: 'Téléphone 1',
  phone_2: 'Téléphone 2',
  email: 'E-mail',
  website: 'Site web',
  director: 'Dirigeant',
  ice: 'ICE',
  rc: 'RC',
  capital: 'Capital',
  address_raw: 'Adresse',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  description: 'Description',
}

// Legacy FIELD_COSTS (kept for backward compat with old CRM/admin code)
export const FIELD_COSTS: Record<string, number> = {
  name: 0, sector: 0, city: 0, region: 0, forme_juridique: 0, status: 0,
  phone: 1, email: 1, website: 1, address: 1,
  effectif_label: 2, dirigeant_name: 2, annee_creation: 2,
  dirigeant_phone: 5, dirigeant_email: 5, revenue_label: 5, capital_social: 5,
  dir_daf_nom: 2, dir_daf_email: 5, dir_daf_tel: 5,
  dir_rh_nom: 2, dir_rh_email: 5, dir_rh_tel: 5,
  dir_achat_nom: 2, dir_achat_email: 5, dir_achat_tel: 5,
  dir_marketing_nom: 2, dir_marketing_email: 5, dir_marketing_tel: 5,
  dir_commercial_nom: 2, dir_commercial_email: 5, dir_commercial_tel: 5,
}
export const FREE_FIELDS = Object.entries(FIELD_COSTS).filter(([,v]) => v === 0).map(([k]) => k)

// ── Plans ────────────────────────────────────────────────────────
export const PLANS = {
  decouverte: { id:'decouverte', name:'Découverte', price:0,   annual:0,   credits:100,  users:1,    crm:'readonly' as const },
  solo:       { id:'solo',       name:'Solo',        price:149, annual:119, credits:400,  users:1,    crm:'full'     as const },
  equipe:     { id:'equipe',     name:'Équipe',      price:390, annual:299, credits:1500, users:3,    crm:'full'     as const },
  business:   { id:'business',   name:'Business',    price:990, annual:790, credits:5000, users:10,   crm:'advanced' as const },
  entreprise: { id:'entreprise', name:'Entreprise',  price:0,   annual:0,   credits:null, users:null, crm:'advanced' as const },
}

export const CREDIT_PACKS = [
  { id:'boost',     name:'Pack Boost',     credits:200,   price:59,   pricePerCr:0.30 },
  { id:'essential', name:'Pack Essential', credits:500,   price:139,  pricePerCr:0.28 },
  { id:'growth',    name:'Pack Growth',    credits:2000,  price:469,  pricePerCr:0.23 },
  { id:'pro',       name:'Pack Pro',       credits:5000,  price:990,  pricePerCr:0.20 },
  { id:'mega',      name:'Pack Mega',      credits:15000, price:2490, pricePerCr:0.17 },
]

// ── Cities / Regions ─────────────────────────────────────────────
export const CITIES = [
  'Casablanca','Rabat','Tanger','Marrakech',
  'Agadir','Fès','Meknès','Oujda',
  'Settat','Khouribga','El Jadida','Béni Mellal',
  'Tétouan','Safi','Salé','Bouskoura',
  'Mohammedia','Kénitra','Nador','Berrechid',
  'Khémisset','Tiznit','Larache','Khénifra',
  'Taza','Guelmim','Essaouira','Azilal',
]

export const REGIONS = [
  'Casablanca-Settat','Rabat-Salé-Kénitra','Tanger-Tétouan-Al Hoceïma',
  'Marrakech-Safi','Fès-Meknès','Souss-Massa','Oriental',
  'Béni Mellal-Khénifra','Drâa-Tafilalet',
]

// ── Search ───────────────────────────────────────────────────────
export const MAX_RESULTS = 500
export const PAGE_SIZE   = 30

// ── Sector Icons (emoji map) ─────────────────────────────────────
export const SECTOR_ICONS: Record<string, string> = {
  'Santé et bien-être': '🏥',
  'BTP & Construction': '🏗️',
  "Technologies de l'information": '💻',
  'Import / Export': '🚢',
  'Industrie & Manufacturing': '🏭',
  'Agroalimentaire': '🌾',
  'Services Financiers': '💰',
  'Commerce & Distribution': '🛒',
  'Transport & Logistique': '🚛',
  'Immobilier': '🏠',
  'Education & Formation': '🎓',
  'Tourisme & Hôtellerie': '✈️',
  'Juridique & Conseil': '⚖️',
  'Artisanat': '🎨',
  'Agriculture': '🌿',
  'Energie': '⚡',
  'Médias & Communication': '📢',
  'Sport & Loisirs': '⚽',
}

export const DEFAULT_SECTOR_ICON = '🏢'
