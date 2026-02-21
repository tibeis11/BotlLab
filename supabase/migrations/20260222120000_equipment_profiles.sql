-- ────────────────────────────────────────────────────────────────────────────
-- Equipment Profiles (Brauanlage-Profile)
--
-- Brauer können ihre Anlage einmalig konfigurieren. Die Parameter werden
-- dann automatisch in BrewEditor und Session-Planung übernommen.
--
-- Felder: boil_off_rate, trub_loss, grain_absorption, cooling_shrinkage,
--         mash_thickness — identisch mit den config-Parametern in
--         lib/brewing-calculations.ts → calculateWaterProfile()
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id        UUID        NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  brew_method       TEXT        NOT NULL DEFAULT 'all_grain'
                                CHECK (brew_method IN ('all_grain', 'extract', 'biab')),
  batch_volume_l    NUMERIC(6,2) NOT NULL DEFAULT 20,
  boil_off_rate     NUMERIC(5,3) NOT NULL DEFAULT 3.5,   -- L/h
  trub_loss         NUMERIC(5,3) NOT NULL DEFAULT 0.5,   -- L
  grain_absorption  NUMERIC(5,3) NOT NULL DEFAULT 0.96,  -- L/kg
  cooling_shrinkage NUMERIC(5,4) NOT NULL DEFAULT 0.04,  -- 0.04 = 4%
  mash_thickness    NUMERIC(5,3) NOT NULL DEFAULT 3.5,   -- L/kg
  is_default        BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nur ein Default pro Brewery (Partial Unique Index)
CREATE UNIQUE INDEX IF NOT EXISTS equipment_profiles_one_default
  ON equipment_profiles(brewery_id)
  WHERE is_default = true;

-- Performance: alle Profile einer Brewery laden
CREATE INDEX IF NOT EXISTS equipment_profiles_brewery_idx
  ON equipment_profiles(brewery_id);

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_equipment_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipment_profiles_updated_at
  BEFORE UPDATE ON equipment_profiles
  FOR EACH ROW EXECUTE FUNCTION update_equipment_profiles_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE equipment_profiles ENABLE ROW LEVEL SECURITY;

-- Lesen: alle aktiven Mitglieder der Brewery
CREATE POLICY "members can read equipment profiles"
  ON equipment_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members m
      WHERE m.brewery_id = equipment_profiles.brewery_id
        AND m.user_id = auth.uid()
    )
  );

-- Einfügen: nur Owner/Admin
CREATE POLICY "admin can insert equipment profiles"
  ON equipment_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brewery_members m
      WHERE m.brewery_id = equipment_profiles.brewery_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- Aktualisieren: nur Owner/Admin
CREATE POLICY "admin can update equipment profiles"
  ON equipment_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members m
      WHERE m.brewery_id = equipment_profiles.brewery_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- Löschen: nur Owner/Admin
CREATE POLICY "admin can delete equipment profiles"
  ON equipment_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members m
      WHERE m.brewery_id = equipment_profiles.brewery_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: Default-Profil setzen
-- Setzt is_default=true für das angegebene Profil und alle anderen auf false.
-- Muss als einzige atomare Operation laufen damit der UNIQUE INDEX hält.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_default_equipment_profile(
  p_profile_id uuid,
  p_brewery_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifiziere Berechtigung
  IF NOT EXISTS (
    SELECT 1 FROM brewery_members m
    WHERE m.brewery_id = p_brewery_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  -- Alle anderen auf false
  UPDATE equipment_profiles
  SET    is_default = false
  WHERE  brewery_id = p_brewery_id
    AND  id <> p_profile_id;

  -- Dieses auf true
  UPDATE equipment_profiles
  SET    is_default = true
  WHERE  id = p_profile_id
    AND  brewery_id = p_brewery_id;
END;
$$;

-- Fix search_path security lint for functions defined in this migration
ALTER FUNCTION public.update_equipment_profiles_updated_at()
  SET search_path = public;
