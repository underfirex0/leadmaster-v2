# LeadMaster V2 — Complete Setup Guide
## New Repo + New Supabase from scratch

---

## STEP 1 — Create GitHub Repo

```bash
# Create new repo on github.com, then:
git clone https://github.com/YOUR_USERNAME/leadmaster-v2.git
cd leadmaster-v2

# Copy this project into it
cp -r /path/to/leadmaster-v2/* .
git add .
git commit -m "Initial LeadMaster V2"
git push
```

---

## STEP 2 — Create Supabase Project

1. Go to **supabase.com** → New project
2. Name: `leadmaster-v2`
3. Password: save it!
4. Region: **EU West** (closest to Morocco)
5. Wait for project to start (~2 min)

Get your keys from **Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## STEP 3 — Run the Schema SQL

In Supabase → **SQL Editor → New query**:

1. **Paste** the contents of `supabase/schema_v2_fresh.sql`
2. Click **Run**
3. You should see: "Success. No rows returned"

This creates all tables:
- `profiles` — users + credits
- `companies` — your 53k+ company data
- `company_unlocks` — which companies each user unlocked
- `crm_leads` — CRM pipeline
- `queries` — search history
- `subscriptions`, `invoices`, `credit_transactions`, etc.

And the SQL functions:
- `search_companies_v2()` — fast paginated search
- `count_companies_v2()` — count for estimates
- `get_nomenclature_tree()` — builds sector tree from your data

---

## STEP 4 — Load Your Company Data

### Option A — SQL (for the sample batch)
In Supabase → SQL Editor:
```sql
-- Paste contents of supabase/seed_batch.sql
```

### Option B — CSV import in Supabase (easiest for big files)
1. Supabase → **Table Editor → companies**
2. Click **Import data**
3. Upload `supabase/companies_batch.csv`
4. Map columns (auto-detected)
5. Click **Import**

### Option C — Python script (for 53k+ companies)
```bash
cd supabase/
pip install supabase python-dotenv

# Set your env vars:
export NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

python import_csv.py your_full_companies.csv
```

Your CSV format must have these headers:
```
telecontact_id, name, city, address_raw, phone_1, phone_2,
website, facebook, instagram, ice, director, description,
rubs, primary_sector, primary_domaine, primary_activite
```
(Same format as the batch you already have — just scale it up!)

### Option D — Direct from Supabase table copy
If your old Supabase (telecontact project) is still running:
```sql
-- In your OLD Supabase, run this to export:
COPY (
  SELECT
    c.telecontact_id, c.name, c.city, c.address_raw,
    c.phone_1, c.phone_2, c.email, c.website,
    c.facebook, c.instagram, c.ice, c.director,
    c.description, c.activities,
    n.sector AS primary_sector,
    n.domaine AS primary_domaine,
    n.activite AS primary_activite
  FROM companies c
  LEFT JOIN company_rubs cr ON cr.company_id = c.id
  LEFT JOIN nomenclature n ON n.id = cr.nomenclature_id
) TO STDOUT WITH CSV HEADER;
-- Then import that CSV into your new Supabase
```

---

## STEP 5 — Enable Supabase Auth

1. Supabase → **Authentication → Providers → Email** → Enable
2. **Auth → URL Configuration**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

---

## STEP 6 — Create First Admin User

1. Sign up in your app normally
2. In Supabase → **SQL Editor**:
```sql
UPDATE public.profiles
SET is_admin = true, credit_balance = 9999
WHERE email = 'your@email.com';
```

---

## STEP 7 — Deploy to Vercel

1. Go to **vercel.com** → New Project
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL       = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY      = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL            = https://your-app.vercel.app
```

5. Click **Deploy**

---

## STEP 8 — Verify Everything Works

After deploy, check:
- [ ] `/` Landing page loads
- [ ] `/register` Can create account (gets 100 free credits)
- [ ] `/search` Nomenclature tree loads (sectors from your data)
- [ ] `/search` → Click "Voir les entreprises" → results show
- [ ] Click "🔓 Débloquer (1 cr)" → works, credit deducted
- [ ] `/my-data` Shows unlocked companies
- [ ] "Injecter → CRM" → company appears in `/crm`
- [ ] `/admin` (admin user only) → stats, users, data browse

---

## STEP 9 — Load Your Full 53k Dataset

Once the app is working with the sample batch:

1. Export your full dataset from telecontact scraper Supabase as CSV
2. Make sure it has the right column format (see Step 4)
3. Run `python import_csv.py full_dataset.csv`
4. Check count: Supabase → Table Editor → companies → row count

The nomenclature tree on `/search` auto-builds from whatever `primary_sector` / `primary_domaine` / `primary_activite` values exist in your companies table.

---

## Data Format Reference

Your batch data is already in the right format:

| Column | Example | Notes |
|--------|---------|-------|
| `telecontact_id` | `9037176` | Unique ID, dedup key |
| `name` | `Soumaya Harakat` | Company name |
| `city` | `Casablanca` | City |
| `phone_1` | `06 66 46 67 09` | Primary phone |
| `phone_2` | `05 22 10 56 95` | Secondary phone |
| `website` | `http://...` | Website URL |
| `facebook` | `https://fb.com/...` | Facebook URL |
| `instagram` | `https://ig.com/...` | Instagram URL |
| `ice` | `2240128000021` | Fiscal ID |
| `director` | `M. Benziane` | Director name |
| `rubs` | `["Pharmacies"]` | JSON array of activities |
| `primary_sector` | `Santé et bien-être` | Sector (for tree) |
| `primary_domaine` | `Médecine` | Domaine (for tree) |
| `primary_activite` | `Pharmacies` | Activite (for tree) |

---

## Architecture Summary

```
User searches → selects sectors/activites (tree checkboxes)
             → GET /api/nomenclature (built from companies table)
             → POST /api/search (RPC: search_companies_v2)
             → sees company cards (name, city, activities — FREE)
             
User unlocks → POST /api/unlock { company_ids: ["uuid"] }
             → 1 credit deducted per company
             → company_unlocks record created
             → full data revealed (phone, email, director, ICE...)
             
User views data → GET /api/my-data
               → all unlocked companies with full data
               
User injects → POST /api/my-data/inject { company_ids: [...] }
             → creates crm_leads with source='data'
             → appears in /crm pipeline
```

---

## Credit Costs

| Action | Cost |
|--------|------|
| Browse search results | **FREE** |
| See basic info (name, city, sector) | **FREE** |
| Unlock 1 company (phone + email + director + ICE + all) | **1 credit** |
| Re-unlock same company | **FREE** (already yours) |

---

## Common Issues

**Nomenclature tree is empty**
→ No companies in DB yet, or all companies have NULL primary_sector. Run the seed SQL.

**"RPC function not found" error**
→ The schema SQL wasn't fully run. Re-run `schema_v2_fresh.sql` in Supabase SQL Editor.

**Auth redirect loop**
→ Check Supabase Auth → URL Configuration → Site URL matches your Vercel domain.

**Unlock gives "Crédits insuffisants"**
→ Your test user has 0 credits. Run:
```sql
UPDATE profiles SET credit_balance = 500 WHERE email = 'you@test.com';
```
