-- ============================================================
-- LeadMaster V2 — Complete Fresh Schema
-- Run this in your NEW Supabase SQL Editor (in order)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email          TEXT NOT NULL,
  full_name      TEXT,
  credit_balance INTEGER NOT NULL DEFAULT 100,
  plan_id        TEXT NOT NULL DEFAULT 'decouverte',
  is_admin       BOOLEAN NOT NULL DEFAULT false,
  onboarded      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- COMPANIES  (main data — from telecontact / your batches)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telecontact_id   TEXT UNIQUE,
  name             TEXT NOT NULL,
  city             TEXT,
  address_raw      TEXT,
  phone_1          TEXT,
  phone_2          TEXT,
  email            TEXT,
  website          TEXT,
  facebook         TEXT,
  instagram        TEXT,
  linkedin         TEXT,
  youtube          TEXT,
  ice              TEXT,
  director         TEXT,
  forme_juridique  TEXT,
  capital          TEXT,
  annee_creation   TEXT,
  rc               TEXT,
  description      TEXT,
  activities       JSONB DEFAULT '[]',   -- rubs array e.g. ["Pharmacies","Cliniques"]
  primary_sector   TEXT,                  -- e.g. "Santé et bien-être"
  primary_domaine  TEXT,                  -- e.g. "Médecine"
  primary_activite TEXT,                  -- e.g. "Médecins généralistes"
  rating           NUMERIC,
  review_count     INTEGER,
  is_recommended   BOOLEAN DEFAULT false,
  logo_url         TEXT,
  source_url       TEXT,
  latitude         NUMERIC,
  longitude        NUMERIC,
  scraped_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS companies_name_idx           ON public.companies USING gin(to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS companies_city_idx           ON public.companies(city);
CREATE INDEX IF NOT EXISTS companies_primary_sector_idx ON public.companies(primary_sector);
CREATE INDEX IF NOT EXISTS companies_primary_domaine_idx ON public.companies(primary_domaine);
CREATE INDEX IF NOT EXISTS companies_primary_activite_idx ON public.companies(primary_activite);
CREATE INDEX IF NOT EXISTS companies_telecontact_id_idx ON public.companies(telecontact_id);

-- RLS: companies are publicly readable (no auth needed to browse)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are public" ON public.companies FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────
-- COMPANY UNLOCKS  (1 credit = 1 company)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_unlocks (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,
  unlocked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS company_unlocks_user_id_idx    ON public.company_unlocks(user_id);
CREATE INDEX IF NOT EXISTS company_unlocks_company_id_idx ON public.company_unlocks(company_id);

ALTER TABLE public.company_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own unlocks"   ON public.company_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own unlocks" ON public.company_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- CREDIT TRANSACTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount        INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('grant','query','unlock','refund','purchase')),
  description   TEXT,
  balance_after INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- QUERIES (saved search history)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.queries (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filters          JSONB NOT NULL DEFAULT '{}',
  fields_requested TEXT[] NOT NULL DEFAULT '{}',
  result_count     INTEGER NOT NULL DEFAULT 0,
  credits_spent    INTEGER NOT NULL DEFAULT 0,
  query_name       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own queries" ON public.queries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert queries"  ON public.queries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- CRM LEADS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source            TEXT NOT NULL DEFAULT 'data'
                    CHECK (source IN ('search','import','data')),
  company_id        UUID REFERENCES public.companies(id),
  query_id          UUID REFERENCES public.queries(id),

  -- Denormalized fields (for imported / data-sourced leads)
  company_name      TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  contact_name      TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'Maroc',
  sector            TEXT,
  is_manufacturer   BOOLEAN,
  custom_fields     JSONB DEFAULT '{}',
  import_request_id UUID,

  -- Pipeline
  status            TEXT NOT NULL DEFAULT 'to_call'
                    CHECK (status IN ('to_call','in_progress','callback','interested','not_interested','converted','archived')),
  priority          TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','high','urgent')),
  notes             TEXT,
  callback_date     TIMESTAMPTZ,
  callback_note     TEXT,
  last_contacted_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_leads_user_id_idx ON public.crm_leads(user_id);
CREATE INDEX IF NOT EXISTS crm_leads_status_idx  ON public.crm_leads(status);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own leads"    ON public.crm_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leads" ON public.crm_leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON public.crm_leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own leads" ON public.crm_leads FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- CRM CALL LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_call_logs (
  id        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id   UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  outcome   TEXT CHECK (outcome IN ('no_answer','voicemail','callback','interested','not_interested')),
  notes     TEXT,
  called_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own call logs" ON public.crm_call_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert call logs"  ON public.crm_call_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS & PLANS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('active','pending','cancelled','expired')),
  credits_per_month   INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- INVOICES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('subscription','credit_pack','other')),
  plan_id     TEXT,
  amount_mad  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  paid_at     TIMESTAMPTZ
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- DATA UPLOAD REQUESTS (client file imports)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_upload_requests (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name      TEXT NOT NULL,
  file_path      TEXT NOT NULL,
  file_size_bytes INTEGER,
  estimated_rows INTEGER,
  user_notes     TEXT,
  admin_notes    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','completed','rejected')),
  injected_count INTEGER,
  injected_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

ALTER TABLE public.data_upload_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own requests" ON public.data_upload_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert requests"  ON public.data_upload_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- FEATURE ACCESS (admin per-user overrides)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_feature_access (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  feature    TEXT NOT NULL CHECK (feature IN ('search','meetmaster','crm','export','data_upload')),
  enabled    BOOLEAN NOT NULL DEFAULT true,
  reason     TEXT,
  updated_by UUID,
  UNIQUE (user_id, feature)
);

ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own feature access" ON public.user_feature_access FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- RPC: Search companies with nomenclature filter
-- Filters on primary_sector, primary_domaine, primary_activite columns
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_companies_v2(
  p_sectors    TEXT[]  DEFAULT NULL,
  p_domaines   TEXT[]  DEFAULT NULL,
  p_activites  TEXT[]  DEFAULT NULL,
  p_rub_slugs  TEXT[]  DEFAULT NULL,  -- kept for API compat, not used
  p_cities     TEXT[]  DEFAULT NULL,
  p_name       TEXT    DEFAULT NULL,
  p_limit      INT     DEFAULT 30,
  p_offset     INT     DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  city            TEXT,
  annee_creation  TEXT,
  forme_juridique TEXT,
  logo_url        TEXT,
  rating          NUMERIC,
  review_count    INT,
  is_recommended  BOOL,
  activities      JSONB,
  total_count     BIGINT
)
LANGUAGE plpgsql AS $$
DECLARE
  has_nomen_filter BOOLEAN;
BEGIN
  has_nomen_filter := (
    (p_sectors   IS NOT NULL AND array_length(p_sectors,1) > 0) OR
    (p_domaines  IS NOT NULL AND array_length(p_domaines,1) > 0) OR
    (p_activites IS NOT NULL AND array_length(p_activites,1) > 0)
  );

  IF has_nomen_filter THEN
    RETURN QUERY
    WITH filtered AS (
      SELECT DISTINCT c.id, c.name, c.city, c.annee_creation, c.forme_juridique,
        c.logo_url, c.rating, c.review_count, c.is_recommended,
        COALESCE(c.activities, '[]'::jsonb) AS activities
      FROM companies c
      WHERE
        (
          (p_sectors   IS NOT NULL AND c.primary_sector   = ANY(p_sectors))
          OR
          (p_domaines  IS NOT NULL AND c.primary_domaine  = ANY(p_domaines))
          OR
          (p_activites IS NOT NULL AND c.primary_activite = ANY(p_activites))
        )
        AND (p_cities IS NULL OR array_length(p_cities,1) = 0 OR c.city = ANY(p_cities))
        AND (p_name IS NULL OR c.name ILIKE '%' || p_name || '%')
    )
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtered f ORDER BY f.name
    LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    WITH filtered AS (
      SELECT DISTINCT c.id, c.name, c.city, c.annee_creation, c.forme_juridique,
        c.logo_url, c.rating, c.review_count, c.is_recommended,
        COALESCE(c.activities, '[]'::jsonb) AS activities
      FROM companies c
      WHERE
        (p_cities IS NULL OR array_length(p_cities,1) = 0 OR c.city = ANY(p_cities))
        AND (p_name IS NULL OR c.name ILIKE '%' || p_name || '%')
    )
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtered f ORDER BY f.name
    LIMIT p_limit OFFSET p_offset;
  END IF;
END; $$;

-- RPC: Count companies for estimate
CREATE OR REPLACE FUNCTION count_companies_v2(
  p_sectors    TEXT[]  DEFAULT NULL,
  p_domaines   TEXT[]  DEFAULT NULL,
  p_activites  TEXT[]  DEFAULT NULL,
  p_rub_slugs  TEXT[]  DEFAULT NULL,
  p_cities     TEXT[]  DEFAULT NULL,
  p_name       TEXT    DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE result BIGINT; has_nomen BOOLEAN;
BEGIN
  has_nomen := (
    (p_sectors  IS NOT NULL AND array_length(p_sectors,1) > 0) OR
    (p_domaines IS NOT NULL AND array_length(p_domaines,1) > 0) OR
    (p_activites IS NOT NULL AND array_length(p_activites,1) > 0)
  );
  IF has_nomen THEN
    SELECT COUNT(*) INTO result FROM companies c WHERE
      ((p_sectors  IS NOT NULL AND c.primary_sector  = ANY(p_sectors))
       OR (p_domaines IS NOT NULL AND c.primary_domaine = ANY(p_domaines))
       OR (p_activites IS NOT NULL AND c.primary_activite = ANY(p_activites)))
      AND (p_cities IS NULL OR array_length(p_cities,1) = 0 OR c.city = ANY(p_cities))
      AND (p_name IS NULL OR c.name ILIKE '%' || p_name || '%');
  ELSE
    SELECT COUNT(*) INTO result FROM companies c WHERE
      (p_cities IS NULL OR array_length(p_cities,1) = 0 OR c.city = ANY(p_cities))
      AND (p_name IS NULL OR c.name ILIKE '%' || p_name || '%');
  END IF;
  RETURN result;
END; $$;

-- RPC: Get nomenclature tree from actual company data (no separate table needed!)
CREATE OR REPLACE FUNCTION get_nomenclature_tree()
RETURNS TABLE (sector TEXT, domaine TEXT, activite TEXT, company_count BIGINT)
LANGUAGE sql AS $$
  SELECT
    primary_sector   AS sector,
    primary_domaine  AS domaine,
    primary_activite AS activite,
    COUNT(*)         AS company_count
  FROM companies
  WHERE primary_sector IS NOT NULL
    AND primary_sector != ''
  GROUP BY primary_sector, primary_domaine, primary_activite
  ORDER BY primary_sector, primary_domaine, primary_activite;
$$;
