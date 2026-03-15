-- Migration: Phase 4 — Import-Queue Erweiterungen & Duplicate Prevention
--
-- Änderungen:
--   1. import_count + rejection_reason Spalten für ingredient_import_queue
--   2. Unique Index auf ingredient_products (master_id, LOWER(manufacturer))
--   3. Performance-Indizes für Queue-Abfragen
--   4. Admin-Write RLS Policy für ingredient_import_queue
--   5. merge_queue_item()        RPC
--   6. reject_queue_item()       RPC
--   7. check_ingredient_duplicate() RPC

-- ── 1. Schema-Erweiterungen ─────────────────────────────────────────────────

ALTER TABLE public.ingredient_import_queue
  ADD COLUMN IF NOT EXISTS import_count    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Duplikate vor dem Unique Index bereinigen (behalte älteste Zeile je Master+Hersteller)
DELETE FROM public.ingredient_products
WHERE id NOT IN (
  SELECT DISTINCT ON (master_id, LOWER(manufacturer)) id
  FROM public.ingredient_products
  WHERE manufacturer IS NOT NULL
  ORDER BY master_id, LOWER(manufacturer), created_at ASC NULLS LAST, id ASC
);

-- Unique Constraint: verhindert doppelte Produkte (gleicher Master + gleicher Hersteller)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_products_unique
  ON public.ingredient_products(master_id, LOWER(manufacturer))
  WHERE manufacturer IS NOT NULL;

-- Performance-Indizes für Queue-Filterung und Deduplizierung
CREATE INDEX IF NOT EXISTS idx_import_queue_status
  ON public.ingredient_import_queue(status);

CREATE INDEX IF NOT EXISTS idx_import_queue_dedup
  ON public.ingredient_import_queue(LOWER(raw_name), type, status);

-- ── 2. Admin-Write RLS Policy für ingredient_import_queue ───────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ingredient_import_queue'
      AND policyname = 'admins can manage import queue'
  ) THEN
    CREATE POLICY "admins can manage import queue"
    ON public.ingredient_import_queue
    FOR ALL
    USING (
      auth.jwt() ->> 'role' = 'service_role'
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE profile_id = auth.uid() AND is_active = true
      )
    );
  END IF;
END $$;

-- ── 3. RPC: increment_import_queue_count ─────────────────────────────────────
-- Atomares Increment für import_count — wird aus dem Import-Action aufgerufen.

CREATE OR REPLACE FUNCTION increment_import_queue_count(p_queue_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE ingredient_import_queue
  SET import_count = COALESCE(import_count, 1) + 1
  WHERE id = p_queue_id;
$$;

-- ── 4. RPC: merge_queue_item ─────────────────────────────────────────────────
-- Führt einen Queue-Eintrag mit einem bestehenden oder neuen Master zusammen.
-- Aktualisiert alle recipe_ingredients, die noch auf einen Unknown-Fallback-Master zeigen.
--
-- Verwendung:
--   - mode "link_existing": p_master_id setzen, p_master_name/type leer lassen
--   - mode "create_new":    p_master_name + p_master_type setzen, p_master_id = NULL
--   - Produkt optional: p_product_name oder p_manufacturer setzen

CREATE OR REPLACE FUNCTION merge_queue_item(
  p_queue_id        UUID,
  p_master_id       UUID     DEFAULT NULL,
  p_master_name     TEXT     DEFAULT NULL,
  p_master_type     TEXT     DEFAULT NULL,
  p_master_aliases  TEXT[]   DEFAULT '{}',
  p_manufacturer    TEXT     DEFAULT NULL,
  p_product_name    TEXT     DEFAULT NULL,
  p_color_ebc       NUMERIC  DEFAULT NULL,
  p_potential_pts   NUMERIC  DEFAULT NULL,
  p_alpha_pct       NUMERIC  DEFAULT NULL,
  p_beta_pct        NUMERIC  DEFAULT NULL,
  p_attenuation_pct NUMERIC  DEFAULT NULL,
  p_notes           TEXT     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_id   UUID;
  v_product_id  UUID;
  v_queue       ingredient_import_queue;
  v_affected    INTEGER;
BEGIN
  -- Queue-Eintrag laden (nur pending)
  SELECT * INTO v_queue
  FROM ingredient_import_queue
  WHERE id = p_queue_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue-Eintrag nicht gefunden oder bereits verarbeitet: %', p_queue_id;
  END IF;

  -- ── Master bestimmen ──────────────────────────────────────────────────────
  IF p_master_id IS NOT NULL THEN
    -- Vorhandenen Master verwenden
    v_master_id := p_master_id;
  ELSIF p_master_name IS NOT NULL AND p_master_type IS NOT NULL THEN
    -- Neuen Master anlegen
    INSERT INTO ingredient_master (name, type, aliases)
    VALUES (p_master_name, p_master_type, COALESCE(p_master_aliases, '{}'))
    RETURNING id INTO v_master_id;
  ELSE
    RAISE EXCEPTION 'Entweder p_master_id oder (p_master_name + p_master_type) muss angegeben werden.';
  END IF;

  -- ── Produkt optional anlegen ──────────────────────────────────────────────
  IF p_product_name IS NOT NULL OR p_manufacturer IS NOT NULL THEN

    -- Bereits vorhandenes Produkt suchen (case-insensitive Hersteller-Vergleich)
    SELECT id INTO v_product_id
    FROM ingredient_products
    WHERE master_id = v_master_id
      AND (
        (p_manufacturer IS NULL AND manufacturer IS NULL)
        OR LOWER(manufacturer) = LOWER(p_manufacturer)
      )
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO ingredient_products (
        master_id, name, manufacturer,
        color_ebc, potential_pts, alpha_pct, beta_pct,
        attenuation_pct, notes, is_verified
      ) VALUES (
        v_master_id,
        COALESCE(p_product_name, v_queue.raw_name),
        p_manufacturer,
        p_color_ebc, p_potential_pts, p_alpha_pct, p_beta_pct,
        p_attenuation_pct, p_notes,
        true  -- durch Admin angelegt → direkt als verifiziert markieren
      )
      RETURNING id INTO v_product_id;
    END IF;
  END IF;

  -- ── recipe_ingredients aktualisieren ──────────────────────────────────────
  -- Nur Zeilen, die noch auf einen der generischen Fallback-Master zeigen.
  UPDATE recipe_ingredients
  SET
    master_id  = v_master_id,
    product_id = COALESCE(v_product_id, product_id)
  WHERE
    LOWER(raw_name) = LOWER(v_queue.raw_name)
    AND type = v_queue.type
    AND master_id IN (
      '00000000-0000-4000-a000-000000000001'::UUID,  -- Unbekanntes Malz
      '00000000-0000-4000-a000-000000000002'::UUID,  -- Unbekannter Hopfen
      '00000000-0000-4000-a000-000000000003'::UUID,  -- Unbekannte Hefe
      '00000000-0000-4000-a000-000000000004'::UUID   -- Unbekannte Zutat
    );

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  -- ── Queue-Eintrag abschließen ─────────────────────────────────────────────
  UPDATE ingredient_import_queue
  SET
    status              = 'merged',
    suggested_master_id = v_master_id
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'master_id',       v_master_id,
    'product_id',      v_product_id,
    'recipes_updated', v_affected
  );
END;
$$;

-- ── 4. RPC: reject_queue_item ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reject_queue_item(
  p_queue_id UUID,
  p_reason   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ingredient_import_queue
  SET
    status           = 'rejected',
    rejection_reason = p_reason
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue-Eintrag nicht gefunden: %', p_queue_id;
  END IF;
END;
$$;

-- ── 5. RPC: check_ingredient_duplicate ───────────────────────────────────────
-- Gibt ähnliche Produkte zurück (Trigram-Ähnlichkeit > 0.4) für den Duplikat-Check
-- im Admin-Merge-Dialog.

CREATE OR REPLACE FUNCTION check_ingredient_duplicate(
  p_name         TEXT,
  p_type         TEXT,
  p_manufacturer TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id       UUID,
  master_name      TEXT,
  product_name     TEXT,
  manufacturer     TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id                                     AS product_id,
    im.name                                   AS master_name,
    ip.name                                   AS product_name,
    ip.manufacturer                           AS manufacturer,
    GREATEST(
      similarity(ip.name, p_name),
      similarity(im.name, p_name)
    )::REAL                                   AS similarity_score
  FROM ingredient_products ip
  JOIN ingredient_master im ON im.id = ip.master_id
  WHERE im.type = p_type
    AND GREATEST(
      similarity(ip.name, p_name),
      similarity(im.name, p_name)
    ) > 0.4
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$;
