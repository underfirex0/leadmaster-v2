-- ═══════════════════════════════════════════════════════════════
-- DATA PRO — curated premium datasets (Tier 2)
-- Run this whole file once in the Supabase SQL editor.
-- Safe to re-run (IF NOT EXISTS everywhere).
-- ═══════════════════════════════════════════════════════════════

-- ── datasets ───────────────────────────────────────────────────
-- One row per curated dataset (e.g. "Top 500 Maroc", "BTP", "Hôtels")
CREATE TABLE IF NOT EXISTS public.datasets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  sector_tag    TEXT,                      -- e.g. "BTP", "Industrie", "Hôtellerie"
  credit_cost   INTEGER NOT NULL DEFAULT 0, -- flat cost to unlock the WHOLE dataset
  record_count  INTEGER NOT NULL DEFAULT 0, -- denormalized, kept in sync on upload
  field_schema  JSONB NOT NULL DEFAULT '[]', -- [{key,label,type,icon?,group?}] for EXTRA (non-standard) fields
  cover_emoji   TEXT DEFAULT '💎',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── dataset_companies ──────────────────────────────────────────
-- Rows belonging to a dataset. Standard fields get real columns (fast,
-- filterable, render with existing icons). Anything dataset-specific
-- goes into extra_fields (JSONB) and renders dynamically from field_schema.
CREATE TABLE IF NOT EXISTS public.dataset_companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id    UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  city          TEXT,
  address_raw   TEXT,
  phone_1       TEXT,
  phone_2       TEXT,
  email         TEXT,
  website       TEXT,
  director      TEXT,
  ice           TEXT,
  rc            TEXT,
  capital       TEXT,
  effectif      TEXT,
  forme_juridique TEXT,
  annee_creation  TEXT,
  primary_sector  TEXT,
  extra_fields  JSONB NOT NULL DEFAULT '{}',  -- { field_key: value, ... } — dynamic, per field_schema
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dataset_companies_dataset_id_idx ON public.dataset_companies(dataset_id);
CREATE INDEX IF NOT EXISTS dataset_companies_name_idx ON public.dataset_companies USING gin (to_tsvector('simple', coalesce(name,'')));

-- ── dataset_unlocks ────────────────────────────────────────────
-- One row per (user, dataset) purchase. Flat cost = full access forever.
CREATE TABLE IF NOT EXISTS public.dataset_unlocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id    UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, dataset_id)
);

CREATE INDEX IF NOT EXISTS dataset_unlocks_user_id_idx ON public.dataset_unlocks(user_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.datasets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_unlocks   ENABLE ROW LEVEL SECURITY;

-- Everyone logged in can browse active dataset catalog (metadata only —
-- actual dataset_companies rows are only ever read server-side via the
-- service-role client in API routes, never directly from the browser).
DROP POLICY IF EXISTS "Anyone can view active datasets" ON public.datasets;
CREATE POLICY "Anyone can view active datasets" ON public.datasets
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage datasets" ON public.datasets;
CREATE POLICY "Admins manage datasets" ON public.datasets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins manage dataset_companies" ON public.dataset_companies;
CREATE POLICY "Admins manage dataset_companies" ON public.dataset_companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users see own unlocks" ON public.dataset_unlocks;
CREATE POLICY "Users see own unlocks" ON public.dataset_unlocks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own unlocks" ON public.dataset_unlocks;
CREATE POLICY "Users insert own unlocks" ON public.dataset_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage dataset_unlocks" ON public.dataset_unlocks;
CREATE POLICY "Admins manage dataset_unlocks" ON public.dataset_unlocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── touch updated_at on datasets ──────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_dataset_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_dataset_updated_at ON public.datasets;
CREATE TRIGGER trg_touch_dataset_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.touch_dataset_updated_at();
