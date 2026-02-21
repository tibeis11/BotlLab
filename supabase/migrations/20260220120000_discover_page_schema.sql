-- ============================================================
-- Migration: Discover-Page Schema-Erweiterung
-- Datum: 2026-02-20
-- Zweck: Neue Spalten für Braumethode, Gärungstyp, Komplexität,
--        Trending-Score, Quality Score und Copy-Count.
--        Alle Änderungen sind rein additiv (IF NOT EXISTS).
-- ============================================================

-- ------------------------------------------------------------
-- BACKUP (Sicherheitsnetz)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brews_backup_pre_discover_migration
    AS SELECT * FROM brews WHERE false; -- Struktur-Klon, kein Daten-Dump

-- HINWEIS: Für einen vollständigen Datendump vor der Migration
-- einmalig manuell ausführen:
--   CREATE TABLE brews_backup_pre_discover_migration AS SELECT * FROM brews;


-- ============================================================
-- PHASE 0.1 – Neue Spalten hinzufügen
-- ============================================================

-- ⚠️  Die bestehende Spalte `brew_type` hat bereits den Constraint
--     CHECK (brew_type IN ('beer','wine','softdrink')) — also
--     Getränkekategorie, NICHT Braumethode.
--     Daher zwei separate neue Spalten:

-- Braumethode (All-Grain / Extrakt / Teilmaische)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS mash_method TEXT DEFAULT NULL
    CHECK (mash_method IN ('all_grain', 'extract', 'partial_mash'));

-- Maischverfahren-Detail (Infusion / Stufenmaische / Dekoktion / BIAB)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS mash_process TEXT DEFAULT NULL
    CHECK (mash_process IN ('infusion', 'step_mash', 'decoction', 'biab'));

-- Gärungstyp (Ale / Lager / Spontan / Gemischt)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS fermentation_type TEXT DEFAULT NULL
    CHECK (fermentation_type IN ('top', 'bottom', 'spontaneous', 'mixed'));

-- Anzahl Raststufen — für Komplexitäts-Badge
ALTER TABLE brews ADD COLUMN IF NOT EXISTS mash_steps_count INTEGER DEFAULT 1;

-- Interner Qualitäts-Score (0–100) — für Suchreihenfolge, nie öffentlich sichtbar
ALTER TABLE brews ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Trending-Score — materialiserter Wert, per Trigger aktuell gehalten
ALTER TABLE brews ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0;

-- Anzahl Kopien/Forks — für „X× gebraut"-Anzeige
ALTER TABLE brews ADD COLUMN IF NOT EXISTS copy_count INTEGER DEFAULT 0;


-- ============================================================
-- PHASE 0.2 – Backfill bestehender Rezepte
-- (Reihenfolge ist wichtig: erst Grunddaten, dann abgeleitete Scores)
-- ============================================================

-- Schritt 0: mash_method Heuristik
--   Kein mash_steps-Array vorhanden / leer → 'extract'
--   Steps vorhanden → 'all_grain'
--   (Teilmaische kann nicht automatisch erkannt werden)
UPDATE brews
SET mash_method = CASE
    WHEN data->'mash_steps' IS NULL
      OR jsonb_array_length(data->'mash_steps') = 0 THEN 'extract'
    ELSE 'all_grain'
END
WHERE mash_method IS NULL
  AND brew_type = 'beer';

-- Schritt 0b: mash_process Heuristik (nur wenn All-Grain)
--   1 Step → infusion, 2+ Steps → step_mash
UPDATE brews
SET mash_process = CASE
    WHEN jsonb_array_length(data->'mash_steps') = 1 THEN 'infusion'
    WHEN jsonb_array_length(data->'mash_steps') >= 2 THEN 'step_mash'
    ELSE NULL
END
WHERE mash_method = 'all_grain'
  AND mash_process IS NULL
  AND data->'mash_steps' IS NOT NULL
  AND brew_type = 'beer';

-- Schritt 0c: fermentation_type Heuristik aus style-Feld
UPDATE brews
SET fermentation_type = CASE
    WHEN style ILIKE '%lager%'
      OR style ILIKE '%märzen%'
      OR style ILIKE '%pils%'
      OR style ILIKE '%bock%'   THEN 'bottom'
    WHEN style ILIKE '%weizen%'
      OR style ILIKE '%ipa%'
      OR style ILIKE '%ale%'
      OR style ILIKE '%stout%'
      OR style ILIKE '%porter%' THEN 'top'
    WHEN style ILIKE '%lambic%'
      OR style ILIKE '%gueuze%'
      OR style ILIKE '%spontan%' THEN 'spontaneous'
    ELSE NULL
END
WHERE fermentation_type IS NULL
  AND brew_type = 'beer';

-- Schritt 0d: mash_steps_count aus JSONB-Array ableiten
UPDATE brews
SET mash_steps_count = CASE
    WHEN data->'mash_steps' IS NOT NULL
      AND jsonb_array_length(data->'mash_steps') > 0
        THEN jsonb_array_length(data->'mash_steps')
    ELSE 1
END
WHERE brew_type = 'beer';

-- Schritt 0e: copy_count aus vorhandenen Rezepten befüllen
--   (zählt alle Rezepte die dieses als remix_parent_id haben)
UPDATE brews b
SET copy_count = (
    SELECT COUNT(*)
    FROM brews
    WHERE remix_parent_id = b.id
)
WHERE b.is_public = true;

-- Schritt 0f: Trending Score initial berechnen (öffentliche Rezepte)
UPDATE brews
SET trending_score = CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0
        THEN likes_count::float / POWER(
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2, 1.5
        )
    ELSE 0
END
WHERE is_public = true;


-- ============================================================
-- PHASE 0.3 – Supabase-Funktionen & Trigger
-- ============================================================

-- ---- Trigger: Trending Score bei neuem Like aktualisieren ----
CREATE OR REPLACE FUNCTION update_brew_trending_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE brews
    SET trending_score = CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0
            THEN likes_count::float / POWER(
                EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2, 1.5
            )
        ELSE 0
    END
    WHERE id = NEW.brew_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bestehenden Trigger entfernen falls vorhanden (idempotent)
DROP TRIGGER IF EXISTS trg_update_trending_on_like ON likes;

CREATE TRIGGER trg_update_trending_on_like
    AFTER INSERT ON likes
    FOR EACH ROW EXECUTE FUNCTION update_brew_trending_score();


-- ---- Trigger: copy_count bei neuem Remix erhöhen ----
CREATE OR REPLACE FUNCTION increment_brew_copy_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.remix_parent_id IS NOT NULL THEN
        UPDATE brews
        SET copy_count = copy_count + 1
        WHERE id = NEW.remix_parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_increment_copy_count ON brews;

CREATE TRIGGER trg_increment_copy_count
    AFTER INSERT ON brews
    FOR EACH ROW EXECUTE FUNCTION increment_brew_copy_count();


-- ---- Trigger: mash_steps_count aktuell halten ----
CREATE OR REPLACE FUNCTION sync_mash_steps_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.brew_type = 'beer' THEN
        NEW.mash_steps_count := COALESCE(
            CASE
                WHEN NEW.data->'mash_steps' IS NOT NULL
                  AND jsonb_array_length(NEW.data->'mash_steps') > 0
                    THEN jsonb_array_length(NEW.data->'mash_steps')
                ELSE 1
            END,
            1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_mash_steps_count ON brews;

CREATE TRIGGER trg_sync_mash_steps_count
    BEFORE INSERT OR UPDATE OF data ON brews
    FOR EACH ROW EXECUTE FUNCTION sync_mash_steps_count();


-- ============================================================
-- PHASE 0.4 – Datenbankindizes
-- ============================================================

-- Öffentliche Rezepte nach Stil (für Stil-Filter)
CREATE INDEX IF NOT EXISTS idx_brews_public_style
    ON brews (is_public, style) WHERE is_public = true;

-- Sortierung nach Quality Score
CREATE INDEX IF NOT EXISTS idx_brews_quality_score
    ON brews (quality_score DESC) WHERE is_public = true;

-- Sortierung nach Trending Score
CREATE INDEX IF NOT EXISTS idx_brews_trending_score
    ON brews (trending_score DESC) WHERE is_public = true;

-- Filterung nach Braumethode
CREATE INDEX IF NOT EXISTS idx_brews_mash_method
    ON brews (mash_method) WHERE is_public = true AND mash_method IS NOT NULL;

-- Filterung nach Gärungstyp
CREATE INDEX IF NOT EXISTS idx_brews_fermentation_type
    ON brews (fermentation_type) WHERE is_public = true AND fermentation_type IS NOT NULL;

-- Sortierung nach copy_count (für „Meist gebraut")
CREATE INDEX IF NOT EXISTS idx_brews_copy_count
    ON brews (copy_count DESC) WHERE is_public = true;
