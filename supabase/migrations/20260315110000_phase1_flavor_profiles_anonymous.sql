-- ============================================================================
-- Phase 1.1a — flavor_profiles: Anonyme Abgaben ermöglichen
--
-- Änderungen:
-- 1. user_id wird nullable (anonyme Abgaben haben user_id = NULL)
-- 2. Neue Spalte ip_hash (SHA256 aus IP+UA, Spam-Schutz für Gäste)
-- 3. Partial Unique Index: max 1 anonymer Eintrag pro brew_id + ip_hash
-- 4. RLS: Service Role darf anonyme Profile einfügen/updaten
--
-- Voraussetzung für: anonymous_game_sessions (FK auf flavor_profiles.id)
-- ============================================================================

-- 1. user_id nullable machen (war NOT NULL)
ALTER TABLE public.flavor_profiles ALTER COLUMN user_id DROP NOT NULL;

-- 2. ip_hash Spalte hinzufügen
ALTER TABLE public.flavor_profiles ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- 3. Partial Unique Index: Verhindert IP-Spam bei anonymen Abgaben
--    (Ein Gerät kann pro Brew nur einmal anonym abstimmen)
CREATE UNIQUE INDEX IF NOT EXISTS idx_flavor_profiles_anon_ip
  ON public.flavor_profiles (brew_id, ip_hash)
  WHERE user_id IS NULL;

-- Session+IP index (for migrated installs where session_id was added by 20260309130000)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flavor_profiles' AND column_name = 'session_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flavor_profiles_anon_session_ip
      ON public.flavor_profiles(session_id, ip_hash)
      WHERE user_id IS NULL AND session_id IS NOT NULL;
  END IF;
END $$;

-- 4. RLS-Policy: Service Role darf anonyme Profile einfügen
--    (Server Actions nutzen createAdminClient() für anonyme Inserts)
CREATE POLICY "flavor_profiles_insert_anon_service"
  ON public.flavor_profiles FOR INSERT
  WITH CHECK (
    -- Entweder eigene Profile (auth user)
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    -- Oder Service Role für anonyme Profile (user_id IS NULL)
    (auth.role() = 'service_role' AND user_id IS NULL)
  );

-- Bestehende Insert-Policy droppen und durch die neue ersetzen
DROP POLICY IF EXISTS "flavor_profiles_insert_own" ON public.flavor_profiles;

-- 5. RLS-Policy: Service Role darf anonyme Profile updaten (für Claiming)
CREATE POLICY "flavor_profiles_update_anon_service"
  ON public.flavor_profiles FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.role() = 'service_role')
  );

-- Bestehende Update-Policy droppen und durch die neue ersetzen
DROP POLICY IF EXISTS "flavor_profiles_update_own" ON public.flavor_profiles;
