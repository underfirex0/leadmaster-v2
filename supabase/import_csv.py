#!/usr/bin/env python3
"""
LeadMaster V2 — CSV batch importer
Usage: python import_csv.py your_file.csv

CSV must have headers:
  telecontact_id, name, city, address_raw, phone_1, phone_2,
  website, facebook, instagram, ice, director, description,
  rubs, primary_sector, primary_domaine, primary_activite

Optional extra columns (will be used if present):
  email, linkedin, youtube, forme_juridique, capital, annee_creation, rc
"""
import csv, json, sys, os, time
from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BATCH_SIZE   = 50

def clean(v):
    if v is None: return None
    v = str(v).strip()
    return v if v else None

def parse_json_array(v):
    if not v: return []
    v = v.strip()
    try:
        parsed = json.loads(v)
        return parsed if isinstance(parsed, list) else []
    except:
        return []

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_csv.py companies.csv")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    with open(csv_path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"📂  Loaded {len(rows)} rows from {csv_path}")

    inserted = 0
    errors   = 0

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        records = []
        for row in batch:
            rec = {
                "telecontact_id":   clean(row.get("telecontact_id")),
                "name":             clean(row.get("name")),
                "city":             clean(row.get("city")),
                "address_raw":      clean(row.get("address_raw")),
                "phone_1":          clean(row.get("phone_1")),
                "phone_2":          clean(row.get("phone_2")),
                "email":            clean(row.get("email")),
                "website":          clean(row.get("website")),
                "facebook":         clean(row.get("facebook")),
                "instagram":        clean(row.get("instagram")),
                "linkedin":         clean(row.get("linkedin")),
                "youtube":          clean(row.get("youtube")),
                "ice":              clean(row.get("ice")),
                "director":         clean(row.get("director")),
                "forme_juridique":  clean(row.get("forme_juridique")),
                "capital":          clean(row.get("capital")),
                "annee_creation":   clean(row.get("annee_creation")),
                "rc":               clean(row.get("rc")),
                "description":      clean(row.get("description")),
                "activities":       parse_json_array(row.get("rubs") or row.get("activities")),
                "primary_sector":   clean(row.get("primary_sector")),
                "primary_domaine":  clean(row.get("primary_domaine")),
                "primary_activite": clean(row.get("primary_activite")),
            }
            # Skip rows without a name
            if not rec["name"]:
                continue
            # Remove None values so Supabase doesn't complain
            rec = {k: v for k, v in rec.items() if v is not None}
            records.append(rec)

        if not records:
            continue

        try:
            result = supabase.table("companies").upsert(
                records,
                on_conflict="telecontact_id"
            ).execute()
            inserted += len(records)
            print(f"  ✅  Batch {i//BATCH_SIZE + 1}: {len(records)} companies ({inserted}/{len(rows)} total)")
        except Exception as e:
            errors += 1
            print(f"  ❌  Batch {i//BATCH_SIZE + 1} error: {e}")

        time.sleep(0.1)  # small delay to avoid rate limits

    print(f"\n🎉  Done! Inserted/updated: {inserted} | Errors: {errors}")

if __name__ == "__main__":
    main()
