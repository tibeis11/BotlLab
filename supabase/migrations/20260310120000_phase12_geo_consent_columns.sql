-- Phase 12: Geo-Consent — echte Nutzerpositionen statt CDN-Städte
-- Neue optionale Spalten für browser-basierte Standortdaten (nach Consent).
-- Bestehende Spalten (city, country_code, latitude, longitude, geo_source)
-- bleiben als Vercel-IP-Fallback erhalten.

ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS detected_city    TEXT,
  ADD COLUMN IF NOT EXISTS detected_region  TEXT,
  ADD COLUMN IF NOT EXISTS detected_country TEXT,
  ADD COLUMN IF NOT EXISTS geo_consent_given BOOLEAN DEFAULT FALSE;

-- Index für Brauer-Analytics: Standort-Karte auf detected_city filtern
CREATE INDEX IF NOT EXISTS idx_bottle_scans_detected_city
  ON bottle_scans (brewery_id, detected_city)
  WHERE detected_city IS NOT NULL;

COMMENT ON COLUMN bottle_scans.detected_city     IS 'Stadt via Browser Geolocation + Nominatim (opt-in)';
COMMENT ON COLUMN bottle_scans.detected_region    IS 'Region/Bundesland via Browser Geolocation + Nominatim (opt-in)';
COMMENT ON COLUMN bottle_scans.detected_country   IS 'Land via Browser Geolocation + Nominatim (opt-in)';
COMMENT ON COLUMN bottle_scans.geo_consent_given  IS 'User hat explizit Geo-Consent erteilt (true) oder abgelehnt (false)';
