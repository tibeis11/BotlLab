-- Backfill existing bottles with short_codes
-- This anonymous block iterates through bottles with missing short_codes and assigns them a new one.

DO $$
DECLARE 
  r RECORD;
  new_code text;
  collision boolean;
BEGIN
  FOR r IN SELECT id FROM "public"."bottles" WHERE short_code IS NULL LOOP
    
    -- Generate unique code loop
    LOOP
      new_code := generate_short_code();
      
      -- Check for collision
      SELECT EXISTS(SELECT 1 FROM "public"."bottles" WHERE short_code = new_code) INTO collision;
      
      IF NOT collision THEN
        EXIT; -- Exit loop if code is unique
      END IF;
    END LOOP;

    -- Update the bottle
    UPDATE "public"."bottles" 
    SET short_code = new_code 
    WHERE id = r.id;
    
  END LOOP;
END;
$$;
