-- Funktion: Atomic Create Squad
-- Erstellt eine Brauerei UND fügt den Ersteller als Owner hinzu in einer Transaktion.
-- Umgeht RLS Probleme, da SECURITY DEFINER verwendet wird.

CREATE OR REPLACE FUNCTION create_own_squad(name_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_brewery record;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- 1. Check Auth
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt';
  END IF;

  -- 2. Insert Brewery
  INSERT INTO breweries (name)
  VALUES (name_input)
  RETURNING * INTO new_brewery;

  -- 3. Insert Member
  INSERT INTO brewery_members (brewery_id, user_id, role)
  VALUES (new_brewery.id, current_user_id, 'owner');

  -- 4. Return Data
  RETURN row_to_json(new_brewery);
END;
$$;
