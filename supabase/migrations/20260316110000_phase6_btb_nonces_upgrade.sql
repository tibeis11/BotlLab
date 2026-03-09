-- ============================================================================
-- Phase 6: btb_used_nonces Upgrade
--
-- Die bestehende Tabelle hat eine alte Struktur:
--   PRIMARY KEY (nonce, bottle_id, brew_id)
--
-- Neue Struktur analog zu vibe_check_used_nonces / rating_used_nonces:
--   - Surrogate UUID PK
--   - session_id (nullable) für Sud-Scoping
--   - user_id für Audit-Trail
--   - ip_hash für Gast-Tracking
--   - COALESCE-basierter UNIQUE INDEX
--   - RLS Policy (war nur ENABLE, ohne Policy)
-- ============================================================================

-- 1. Neue Spalten hinzufügen
ALTER TABLE public.btb_used_nonces
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- 2. Sicherstellen, dass alle bestehenden Zeilen eine UUID haben
UPDATE public.btb_used_nonces SET id = gen_random_uuid() WHERE id IS NULL;

-- 3. Alten Composite-Primary-Key entfernen und neuen PK auf (id) setzen
DO $$
DECLARE
  v_old_pk TEXT;
BEGIN
  -- Prüfen ob der primary key mehrteilig ist (altes Schema)
  SELECT conname INTO v_old_pk
  FROM pg_constraint
  WHERE conrelid = 'public.btb_used_nonces'::regclass
    AND contype = 'p'
    AND array_length(conkey, 1) > 1;

  IF v_old_pk IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.btb_used_nonces DROP CONSTRAINT ' || quote_ident(v_old_pk);
    ALTER TABLE public.btb_used_nonces ALTER COLUMN id SET NOT NULL;
    ALTER TABLE public.btb_used_nonces ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 5. Neuen COALESCE-basierten UNIQUE INDEX erstellen
-- Für bestehende Einträge ohne session_id wird COALESCE auf den Sentinel-UUID greifen.
CREATE UNIQUE INDEX IF NOT EXISTS unique_btb_nonce
ON public.btb_used_nonces (
  nonce,
  bottle_id,
  brew_id,
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- 6. RLS Policy ergänzen (RLS war bereits aktiviert, aber ohne Policy)
-- Prüfen ob Policy bereits existiert, dann nicht nochmal anlegen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'btb_used_nonces'
      AND policyname = 'service_role_only'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_only" ON public.btb_used_nonces USING (false) WITH CHECK (false)';
  END IF;
END $$;

COMMENT ON TABLE public.btb_used_nonces
  IS 'Anti-Replay Nonces für Beat the Brewer. Jeder QR-Token wird pro Sud/Flasche/Rezept einmalig verbrannt. BTB ist zusätzlich limitiert auf 1x pro User pro Session.';
