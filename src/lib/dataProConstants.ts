// ── DATA Pro — shared constants ──────────────────────────────────
// Standard columns that get real DB columns on dataset_companies.
// Anything else uploaded in a CSV/XLSX becomes an extra_field (JSONB),
// rendered dynamically from the dataset's field_schema. This is what
// lets admin add brand-new niches (Hotels, Restaurants, ...) with zero
// code changes.

export type StandardFieldKey =
  | 'name' | 'city' | 'address_raw' | 'phone_1' | 'phone_2' | 'email'
  | 'website' | 'director' | 'ice' | 'rc' | 'capital' | 'effectif'
  | 'forme_juridique' | 'annee_creation' | 'primary_sector'

export const STANDARD_FIELDS: { key: StandardFieldKey; label: string; icon: string }[] = [
  { key: 'phone_1',         label: 'Téléphone',        icon: '📞' },
  { key: 'phone_2',         label: 'Téléphone 2',      icon: '📞' },
  { key: 'email',           label: 'E-mail',           icon: '✉️' },
  { key: 'website',         label: 'Site web',         icon: '🌐' },
  { key: 'director',        label: 'Dirigeant',        icon: '👤' },
  { key: 'address_raw',     label: 'Adresse',          icon: '📍' },
  { key: 'ice',             label: 'ICE',              icon: '🏛️' },
  { key: 'rc',              label: 'RC',               icon: '🏛️' },
  { key: 'capital',         label: 'Capital social',   icon: '💰' },
  { key: 'effectif',        label: 'Effectif',         icon: '👥' },
  { key: 'forme_juridique', label: 'Forme juridique',  icon: '📄' },
  { key: 'annee_creation',  label: 'Année création',   icon: '📅' },
  { key: 'primary_sector',  label: 'Secteur',          icon: '🏷️' },
]

// Header aliases (lowercased, accents-stripped, no-space) → standard column.
// Used by the admin upload parser to auto-map spreadsheet headers.
export const HEADER_ALIASES: Record<string, StandardFieldKey> = {
  name: 'name', nom: 'name', raisonsociale: 'name', entreprise: 'name', societe: 'name', company: 'name',
  ville: 'city', city: 'city',
  adresse: 'address_raw', adresseraw: 'address_raw', address: 'address_raw',
  telephone: 'phone_1', tel: 'phone_1', phone: 'phone_1', phone1: 'phone_1', telephone1: 'phone_1',
  telephone2: 'phone_2', phone2: 'phone_2', tel2: 'phone_2',
  email: 'email', mail: 'email', emails: 'email',
  siteweb: 'website', website: 'website', web: 'website',
  dirigeant: 'director', dirigeantprincipal: 'director', director: 'director', directeur: 'director', gerant: 'director',
  ice: 'ice',
  rc: 'rc',
  capital: 'capital', capitalsocial: 'capital',
  effectif: 'effectif', nombrecollaborateurs: 'effectif', nbcollaborateurs: 'effectif',
  formejuridique: 'forme_juridique',
  anneecreation: 'annee_creation', datecreation: 'annee_creation',
  secteur: 'primary_sector', filiereprincipale: 'primary_sector', activitesecteur: 'primary_sector', filiere: 'primary_sector',
}

export function normalizeHeader(h: string): string {
  return h
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Guess a JSON type for an extra field from a sample of values (for field_schema).
export function guessFieldType(values: unknown[]): 'text' | 'number' | 'url' | 'email' | 'longtext' {
  const sample = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 20)
  if (!sample.length) return 'text'
  if (sample.every(v => /^https?:\/\//.test(String(v)))) return 'url'
  if (sample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) return 'email'
  if (sample.every(v => !isNaN(Number(String(v).replace(/[\s,]/g, ''))) && String(v).trim() !== '')) return 'number'
  if (sample.some(v => String(v).length > 80)) return 'longtext'
  return 'text'
}

export type FieldSchemaEntry = {
  key: string
  label: string
  type: 'text' | 'number' | 'url' | 'email' | 'longtext'
}

export const SECTOR_BADGES: Record<string, string> = {
  'BTP': '🏗️', 'Industrie': '🏭', 'Hôtellerie': '🏨', 'Restauration': '🍽️',
  'Finance': '💳', 'Santé': '⚕️', 'Immobilier': '🏢', 'Agroalimentaire': '🌾',
}
