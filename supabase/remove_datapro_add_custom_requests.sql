-- ═══════════════════════════════════════════════════════════
-- Migration: "Demande de données spécifiques" + remove DATA Pro
-- Safe to re-run (all statements are idempotent).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Extend data_upload_requests to support text-only requests ──
-- file_name/file_path become optional, and a request_type discriminator
-- + free-text description column are added for the new "no file, just
-- tell us what you need" request flow.

ALTER TABLE public.data_upload_requests ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE public.data_upload_requests ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE public.data_upload_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'file_upload'
  CHECK (request_type IN ('file_upload', 'custom_request'));

ALTER TABLE public.data_upload_requests
  ADD COLUMN IF NOT EXISTS request_description TEXT;

-- A file_upload request must have a file; a custom_request must have a
-- description. Drop+recreate to stay idempotent on re-run.
ALTER TABLE public.data_upload_requests DROP CONSTRAINT IF EXISTS data_upload_requests_type_consistency;
ALTER TABLE public.data_upload_requests ADD CONSTRAINT data_upload_requests_type_consistency
  CHECK (
    (request_type = 'file_upload'    AND file_name IS NOT NULL) OR
    (request_type = 'custom_request' AND request_description IS NOT NULL)
  );


-- ── 2. Remove DATA Pro entirely ────────────────────────────────
-- Drop DATA Pro specific tables. If any of these don't exist in your
-- database, the IF EXISTS makes this a safe no-op for that line.

DROP TABLE IF EXISTS public.dataset_unlocks   CASCADE;
DROP TABLE IF EXISTS public.dataset_companies CASCADE;
DROP TABLE IF EXISTS public.datasets          CASCADE;

-- If crm_leads or companies had an is_pro / pro_dataset_name / pro_extra_fields
-- column bolted on for DATA Pro specifically, they're left in place here
-- deliberately — dropping columns on a live table is riskier than leaving
-- an unused nullable column behind. Clean these up manually later once
-- you've confirmed no code path reads them anymore.
