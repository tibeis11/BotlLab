-- 1. Add short_code column
ALTER TABLE "public"."bottles" ADD COLUMN IF NOT EXISTS "short_code" text;
CREATE UNIQUE INDEX IF NOT EXISTS "bottles_short_code_idx" ON "public"."bottles" ("short_code");

-- 2. Function to generate random short code (base58-like safe charset, no I, l, 0, O)
CREATE OR REPLACE FUNCTION "public"."generate_short_code"()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text[] := '{1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result text := '';
  i integer;
BEGIN
  -- Generate 8 character code
  FOR i IN 1..8 LOOP
    result := result || chars[1+floor(random()*array_length(chars, 1))::int];
  END LOOP;
  RETURN result;
END;
$$;
ALTER FUNCTION "public"."generate_short_code"() OWNER TO "postgres";

-- 3. Trigger function to set short_code on insert
CREATE OR REPLACE FUNCTION "public"."set_short_code_before_insert"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if not provided
  IF NEW.short_code IS NULL THEN
    -- Retry loop for collision handling
    LOOP
      NEW.short_code := generate_short_code();
      -- Check for collision
      IF NOT EXISTS (SELECT 1 FROM "public"."bottles" WHERE "short_code" = NEW.short_code) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_short_code_before_insert"() OWNER TO "postgres";

-- 4. Create trigger
DROP TRIGGER IF EXISTS "ensure_short_code" ON "public"."bottles";
CREATE TRIGGER "ensure_short_code"
BEFORE INSERT ON "public"."bottles"
FOR EACH ROW
EXECUTE FUNCTION "public"."set_short_code_before_insert"();

-- 5. Backfill existing bottles (Optional, can be run manually if timeouts concern)
-- DO $$
-- DECLARE 
--   r RECORD;
-- BEGIN
--   FOR r IN SELECT id FROM "public"."bottles" WHERE short_code IS NULL LOOP
--     UPDATE "public"."bottles" 
--     SET short_code = generate_short_code() 
--     WHERE id = r.id AND short_code IS NULL;
--   END LOOP;
-- END;
-- $$;
