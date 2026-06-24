// ── Telecontact Company (main data source) ──────────────────────
export type Company = {
  id: string
  telecontact_id: string
  name: string
  city: string | null
  address_raw: string | null
  phone_1: string | null
  phone_2: string | null
  phones: string[] | null
  email: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  youtube: string | null
  linkedin: string | null
  ice: string | null
  director: string | null
  forme_juridique: string | null
  capital: string | null
  annee_creation: string | null
  rc: string | null
  latitude: number | null
  longitude: number | null
  activities: string[] | null
  description: string | null
  rating: number | null
  review_count: number | null
  is_recommended: boolean | null
  logo_url: string | null
  source_url: string | null
  scraped_at: string | null
  // joined from nomenclature via company_rubs
  rubs?: NomenclatureRow[]
}

export type CompanyPreview = Pick<
  Company,
  'id' | 'name' | 'city' | 'annee_creation' | 'forme_juridique'
  | 'logo_url' | 'rating' | 'review_count' | 'is_recommended' | 'activities'
> & {
  rubs?: { rub: string; sector: string }[]
  is_unlocked?: boolean
}

export type CompanyFull = Company & {
  rubs?: NomenclatureRow[]
  is_unlocked: true
}

// ── Nomenclature ─────────────────────────────────────────────────
export type NomenclatureRow = {
  id: string
  sector: string
  domaine: string
  activite: string
  rub: string
  rub_slug: string
}

export type NomenclatureActivite = {
  activite: string
  rubs: NomenclatureRow[]
}

export type NomenclatureDomaine = {
  domaine: string
  activites: NomenclatureActivite[]
  totalRubs: number
}

export type NomenclatureSector = {
  sector: string
  domaines: NomenclatureDomaine[]
  totalRubs: number
}

// Selection state
export type NomenclatureSelection = {
  sectors: Set<string>
  domaines: Set<string>    // "sector::domaine"
  activites: Set<string>   // rub_slug values
}

// ── Search ──────────────────────────────────────────────────────
export type SearchFilters = {
  rub_slugs?: string[]
  sectors?: string[]
  domaines?: string[]
  cities?: string[]
  name?: string
}

export type SearchResult = {
  companies: CompanyPreview[]
  totalCount: number
  page: number
  hasMore: boolean
}

// ── Unlock ───────────────────────────────────────────────────────
export type CompanyUnlock = {
  id: string
  user_id: string
  company_id: string
  credits_spent: number
  unlocked_at: string
}

export type UnlockResponse = {
  success: boolean
  creditsSpent: number
  newBalance: number
  alreadyUnlocked: boolean
}

// ── Profile ──────────────────────────────────────────────────────
export type Profile = {
  id: string
  email: string
  full_name: string | null
  credit_balance: number
  plan_id: string
  is_admin: boolean
  onboarded: boolean
  created_at: string
  updated_at: string
}

// ── CRM ──────────────────────────────────────────────────────────
export type CRMStatus =
  | 'to_call' | 'in_progress' | 'callback'
  | 'interested' | 'not_interested' | 'converted' | 'archived'

export type CRMPriority = 'low' | 'normal' | 'high' | 'urgent'

export type CRMLead = {
  id: string
  user_id: string
  source: 'search' | 'import'
  business_id: string | null
  company_id: string | null      // telecontact company id
  query_id: string | null
  company_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  contact_name: string | null
  city: string | null
  country: string | null
  sector: string | null
  is_manufacturer: boolean | null
  custom_fields: Record<string, string>
  import_request_id: string | null
  status: CRMStatus
  priority: CRMPriority
  notes: string | null
  callback_date: string | null
  callback_note: string | null
  last_contacted_at: string | null
  status_changed_at: string | null
  created_at: string
  updated_at: string
  _call_count?: number
}

export type CRMCallLog = {
  id: string
  lead_id: string
  user_id: string
  outcome: 'no_answer' | 'voicemail' | 'callback' | 'interested' | 'not_interested'
  notes: string | null
  called_at: string
}

// ── Subscription ─────────────────────────────────────────────────
export type Subscription = {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'pending' | 'cancelled' | 'expired'
  started_at: string | null
  expires_at: string | null
  credits_per_month: number
  created_at: string
}

// ── Queries (saved searches) ─────────────────────────────────────
export type Query = {
  id: string
  user_id: string
  filters: SearchFilters
  result_count: number
  credits_spent: number
  query_name: string | null
  created_at: string
}

// ── Credit ───────────────────────────────────────────────────────
export type CreditTransaction = {
  id: string
  user_id: string
  amount: number
  type: 'grant' | 'query' | 'unlock' | 'refund' | 'purchase'
  description: string | null
  created_at: string
}

// ── Data Upload Request ──────────────────────────────────────────
export type DataUploadRequest = {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size_bytes: number
  estimated_rows: number
  user_notes: string | null
  admin_notes: string | null
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  injected_count: number | null
  injected_at: string | null
  created_at: string
  updated_at: string
}

// Old Business type (kept for CRM backward compat)
export type Business = {
  id: string
  name: string
  sector: string
  city: string
  region: string | null
  country: string
  forme_juridique: string | null
}

export type UnlockResponse_Legacy = {
  value: string
  creditsSpent: number
  newBalance: number
  alreadyUnlocked: boolean
}
