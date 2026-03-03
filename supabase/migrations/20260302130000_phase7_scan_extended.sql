-- ============================================================================
-- Phase 7: Erweiterte Scan-Datenbasis
-- 7.2 — UTM-Parameter + Referrer in bottle_scans
-- 7.4 — Flaschenfüllalter als bottle_age_days
-- 7.5 — ABV/IBU/SRM als generated columns auf brews
-- ============================================================================

-- ── bottle_scans: neue Kontext-Spalten ────────────────────────────────────────
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS utm_source      text,
  ADD COLUMN IF NOT EXISTS utm_medium      text,
  ADD COLUMN IF NOT EXISTS utm_campaign    text,
  ADD COLUMN IF NOT EXISTS referrer_domain text,          -- normalisierte Domain, z.B. 'instagram.com' oder NULL
  ADD COLUMN IF NOT EXISTS bottle_age_days integer;       -- Tage seit filled_at, NULL wenn unbekannt

-- Indizes für Herkunftsquellen-Auswertung (Phase 7.6)
CREATE INDEX IF NOT EXISTS bottle_scans_referrer_domain_idx
  ON bottle_scans (brewery_id, referrer_domain)
  WHERE referrer_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS bottle_scans_scan_source_idx
  ON bottle_scans (brewery_id, scan_source)
  WHERE scan_source IS NOT NULL;

-- ── brews: ABV / IBU / SRM normalisiert (Phase 7.5) ──────────────────────────
-- Generated STORED columns — immer synchron mit brews.data, indizierbar
-- Regex-Guard verhindert Cast-Fehler bei ungültigen JSON-Werten

ALTER TABLE brews
  ADD COLUMN IF NOT EXISTS abv_calculated numeric(5,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN data->>'abv' ~ '^[0-9]*\.?[0-9]+$'
        THEN (data->>'abv')::numeric
        ELSE NULL
      END
    ) STORED,

  ADD COLUMN IF NOT EXISTS ibu_calculated integer
    GENERATED ALWAYS AS (
      CASE
        WHEN data->>'ibu' ~ '^[0-9]+$'
        THEN (data->>'ibu')::integer
        ELSE NULL
      END
    ) STORED,

  ADD COLUMN IF NOT EXISTS srm_calculated numeric(5,1)
    GENERATED ALWAYS AS (
      CASE
        WHEN data->>'srm' ~ '^[0-9]*\.?[0-9]+$'
        THEN (data->>'srm')::numeric
        ELSE NULL
      END
    ) STORED;

-- Indizes für ABV/IBU range queries (z.B. "Welche ABV-Klasse bekommt die besten Ratings?")
CREATE INDEX IF NOT EXISTS brews_abv_calculated_idx ON brews (abv_calculated) WHERE abv_calculated IS NOT NULL;
CREATE INDEX IF NOT EXISTS brews_ibu_calculated_idx ON brews (ibu_calculated) WHERE ibu_calculated IS NOT NULL;
