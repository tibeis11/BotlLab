-- 1. Bestehende Policy löschen (um Fehler "already exists" zu vermeiden)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 2. Policy neu erstellen: JEDER darf Profile sehen (für Feed & Teamlisten nötig)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING ( true );

-- 3. Policy: Jeder darf sein eigenes Profil erstellen
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- 4. Policy: Jeder darf sein eigenes Profil bearbeiten
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
