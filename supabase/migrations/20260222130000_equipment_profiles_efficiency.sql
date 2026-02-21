-- ────────────────────────────────────────────────────────────────────────────
-- Equipment Profiles — add default_efficiency column
--
-- Brauanlagen haben eine typische Sudhausausbeute (SHA).
-- Das Feld wird beim Laden eines Profils als Startwert für "System-SHA"
-- im BrewEditor und als Ziel-Effizienz in sessions/new vorbelegt.
-- Der Brauer kann den Wert pro Rezept / Session überschreiben.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE equipment_profiles
  ADD COLUMN IF NOT EXISTS default_efficiency NUMERIC(5,2) NOT NULL DEFAULT 75.0;

COMMENT ON COLUMN equipment_profiles.default_efficiency
  IS 'Typische Sudhausausbeute dieser Anlage in Prozent (z.B. 72.0). Wird als Vorschlagswert im BrewEditor und bei neuen Sessions verwendet.';
