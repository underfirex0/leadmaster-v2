# LeadMaster V2 — Full Handoff

## What Changed from V1

| Feature | V1 | V2 |
|---|---|---|
| Data source | `businesses` table (dummy data) | `companies` table (53k real companies from telecontact.ma) |
| Search | Text + sector/city dropdowns | **Nomenclature tree** (sector → domaine → activite checkboxes) |
| Unlock model | Per-field (phone=1cr, email=1cr...) | **Per-company** (1 credit = ALL data for 1 company) |
| My Data page | ❌ | ✅ NEW — shows all unlocked companies, export CSV, inject CRM |
| MeetMaster | Full (incomplete) | **Coming Soon** page |
| CRM inject | Via admin | Via "Mes Données" button |

## Database Setup

### Same Supabase Project as telecontact scraper
The `companies`, `nomenclature`, and `company_rubs` tables already exist (53k companies scraped).

### New migration to run:
```sql
-- Run this in Supabase SQL Editor:
-- supabase/company_unlocks_schema.sql
```
This creates:
- `company_unlocks` table (user × company unlocks)
- `search_companies_v2()` RPC function
- `count_companies_v2()` RPC function
- Adds `company_id` column to `crm_leads`
- Adds `is_admin`, `plan_id`, `onboarded` to `profiles` (if missing)

## Key Architecture

### Search Flow (FREE)
1. User selects nomenclature filters on `/search` (tree checkboxes)
2. Optional: city + name filters
3. Click "Voir les entreprises" → `/results?rub_slugs=...&cities=...`
4. Results show: name, city, activities, forme_juridique, annee_création
5. NO credits charged for browsing

### Unlock Flow (1 CREDIT / company)
1. On `/results`, click "🔓 Débloquer (1 cr)" per company
2. OR checkbox multiple companies → "Débloquer sélection (N cr)"
3. OR "Tout débloquer" for all visible results
4. POST `/api/unlock` with `{ company_ids: [...] }`
5. Credits deducted, `company_unlocks` record created
6. Card immediately shows: phone, email, director, ICE, address, website, social links

### My Data Page `/my-data`
- Shows ALL companies where user has unlock record
- Full data visible (no locks)
- Filters: name search + city
- Export CSV button
- "Injecter → CRM" bulk action (POST `/api/my-data/inject`)
  - Creates `crm_leads` with `source='data'`
  - Skips already-injected companies

## New API Routes

| Route | Method | Description |
|---|---|---|
| `/api/nomenclature` | GET | Nomenclature tree (cached 1hr) |
| `/api/search` | POST | Browse companies (FREE, no credits) |
| `/api/search/estimate` | POST | Count matching companies |
| `/api/unlock` | POST | Unlock 1 or N companies (1 cr each) |
| `/api/my-data` | GET | Get user's unlocked companies |
| `/api/my-data/inject` | POST | Inject unlocked companies to CRM |
| `/api/admin/companies` | GET | Admin browse companies DB |

## Env Variables (same as V1 + telecontact dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=https://ahawaktdzmlrniojwkwa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://leadmasters.vercel.app
```

## Deploy
```
git add .
git commit -m "LeadMaster V2 — nomenclature + telecontact data"
git push
```
Vercel auto-deploys from main. Run `company_unlocks_schema.sql` in Supabase FIRST.

## Nomenclature Tree UI
- Accordion per sector with emoji icon
- Domaine labels within each sector
- Activite checkboxes (leaf nodes)
- Three-state checkbox: none / partial / all
- Search filter within tree
- Selection count badges
- City multi-select dropdown
- Name search input
