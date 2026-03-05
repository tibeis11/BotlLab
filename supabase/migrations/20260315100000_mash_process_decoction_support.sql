-- ============================================================
-- Migration: Dekoktions-Support für mash_process Inferenz
-- ============================================================
-- Aktualisiert die mash_process-Inferenz, um Rezepte mit 
-- step_type='decoction' in mash_steps korrekt als 'decoction'
-- zu klassifizieren (statt nur auf Namen-Keywords zu prüfen).
--
-- Abhängigkeit: 20260220120000_discover_page_schema.sql
-- ============================================================

-- 1. Backfill: Bestehende Rezepte mit Dekoktions-Schritten korrekt setzen
UPDATE brews
SET mash_process = 'decoction'
WHERE brew_type = 'beer'
  AND mash_process IS DISTINCT FROM 'decoction'
  AND data->'mash_steps' IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(data->'mash_steps') AS s 
    WHERE s->>'step_type' = 'decoction'
  );

-- 2. Trigger-Funktion aktualisieren: sync_brew_metadata
-- Diese Funktion wird bei INSERT/UPDATE auf brews gefeuert
-- und leitet mash_process, mash_method, mash_steps_count ab.
CREATE OR REPLACE FUNCTION sync_brew_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- mash_steps_count
  IF NEW.data->'mash_steps' IS NOT NULL 
     AND jsonb_array_length(NEW.data->'mash_steps') > 0 THEN
    NEW.mash_steps_count := jsonb_array_length(NEW.data->'mash_steps');
  ELSE
    NEW.mash_steps_count := COALESCE(NEW.mash_steps_count, 1);
  END IF;

  -- mash_process Inferenz (nur wenn nicht explizit gesetzt)
  IF NEW.mash_process IS NULL AND NEW.brew_type = 'beer' THEN
    IF NEW.data->'mash_steps' IS NOT NULL 
       AND jsonb_array_length(NEW.data->'mash_steps') > 0 THEN
      -- Priorität 1: step_type = 'decoction' explizit gesetzt
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.data->'mash_steps') AS s
        WHERE s->>'step_type' = 'decoction'
      ) THEN
        NEW.mash_process := 'decoction';
      -- Priorität 2: Keyword-basiert (Name enthält Dekoktion etc.)
      ELSIF EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.data->'mash_steps') AS s
        WHERE LOWER(COALESCE(s->>'name', '')) SIMILAR TO '%(dekok|decoction|kochmaische)%'
      ) THEN
        NEW.mash_process := 'decoction';
      -- Priorität 3: Schritt-Anzahl
      ELSIF jsonb_array_length(NEW.data->'mash_steps') = 1 THEN
        NEW.mash_process := 'infusion';
      ELSE
        NEW.mash_process := 'step_mash';
      END IF;
    END IF;
  END IF;

  -- mash_process aus data-Feld übernehmen (Editor setzt es explizit)
  IF NEW.data->>'mash_process' IS NOT NULL AND NEW.data->>'mash_process' <> '' THEN
    NEW.mash_process := NEW.data->>'mash_process';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger erstellen/ersetzen
DROP TRIGGER IF EXISTS trg_sync_brew_metadata ON brews;
CREATE TRIGGER trg_sync_brew_metadata
  BEFORE INSERT OR UPDATE ON brews
  FOR EACH ROW
  EXECUTE FUNCTION sync_brew_metadata();
