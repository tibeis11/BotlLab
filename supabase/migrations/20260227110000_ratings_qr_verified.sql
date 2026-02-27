-- ============================================================
-- Migration: QR-Verified Ratings
-- Date: 2026-02-27
--
-- Adds qr_verified column to ratings so we can distinguish
-- ratings that came through a verified QR-code scan
-- (via /b/[bottle_id]) vs. any other source.
--
-- All existing ratings default to false. New ratings from
-- the /b/[bottle_id] scan flow will have qr_verified = true
-- (set server-side in /api/ratings/submit).
--
-- This enables:
--   - "QR-verifiziert ✓" badge on rating cards
--   - Future filter: "Nur verifizierte Bewertungen anzeigen"
--   - Analytics on trust-level of rating corpus
-- ============================================================

ALTER TABLE "public"."ratings"
  ADD COLUMN IF NOT EXISTS "qr_verified" BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index for the common query "show only verified ratings for a brew".
CREATE INDEX IF NOT EXISTS idx_ratings_qr_verified
  ON "public"."ratings" (brew_id, qr_verified)
  WHERE qr_verified = TRUE;

COMMENT ON COLUMN "public"."ratings"."qr_verified" IS
  'TRUE wenn die Bewertung über einen verifizierten QR-Code-Scan (/b/[bottle_id]) abgegeben wurde. FALSE bei allen anderen Quellen.';
