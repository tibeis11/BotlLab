


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_own_squad"("name_input" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_brewery record;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt';
  END IF;

  INSERT INTO breweries (name)
  VALUES (name_input)
  RETURNING * INTO new_brewery;

  INSERT INTO brewery_members (brewery_id, user_id, role)
  VALUES (new_brewery.id, current_user_id, 'owner');

  RETURN row_to_json(new_brewery);
END;
$$;


ALTER FUNCTION "public"."create_own_squad"("name_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_brewery_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT brewery_id 
    FROM brewery_members 
    WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_brewery_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_brewery_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT brewery_id FROM brewery_members WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_brewery_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE brews
        SET likes_count = likes_count + 1
        WHERE id = NEW.brew_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE brews
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.brew_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."handle_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_like_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    brew_owner_id uuid;
    brew_name text;
begin
    -- 1. Get the owner of the brew
    select user_id, name into brew_owner_id, brew_name
    from public.brews
    where id = new.brew_id;

    -- 2. Determine if we should notify
    -- Constraint: Do NOT notify if user likes their own brew
    if brew_owner_id is distinct from new.user_id then
        
        insert into public.notifications (
            user_id,
            actor_id,
            type,
            data
        ) values (
            brew_owner_id,
            new.user_id,
            'brew_like',
            jsonb_build_object(
                'brew_id', new.brew_id,
                'brew_name', brew_name
            )
        );
        
    end if;

    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_like_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, founded_year, logo_url, tier)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'Neue Brauerei'),
    EXTRACT(YEAR FROM now()),
    '/tiers/lehrling.png',
    'lehrling'
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_bottle_fills"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.brew_id IS NOT NULL AND (OLD.brew_id IS NULL OR OLD.brew_id != NEW.brew_id) THEN
    UPDATE profiles 
    SET total_bottle_fills = total_bottle_fills + 1 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_bottle_fills"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_bottle_fills_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.brew_id IS NOT NULL THEN
    UPDATE profiles 
    SET total_bottle_fills = total_bottle_fills + 1 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_bottle_fills_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of"("_brewery_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Direct low-level query, no RLS triggered here
  RETURN EXISTS (
    SELECT 1 
    FROM brewery_members 
    WHERE brewery_id = _brewery_id 
    AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_member_of"("_brewery_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."brews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "style" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "description" "text",
    "brew_type" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_public" boolean DEFAULT true,
    "remix_parent_id" "uuid",
    "cap_url" "text",
    "brewery_id" "uuid",
    "likes_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "check_brew_type" CHECK (("brew_type" = ANY (ARRAY['beer'::"text", 'wine'::"text", 'softdrink'::"text"])))
);


ALTER TABLE "public"."brews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."brews"."is_public" IS 'Bestimmt, ob das Rezept öffentlich auf der Brauerei-Seite und in Discovery angezeigt wird';



CREATE OR REPLACE FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 
    from public.likes 
    where brew_id = brew_row.id
    and user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "points" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bottles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "bottle_number" integer NOT NULL,
    "brewery_id" "uuid"
);


ALTER TABLE "public"."bottles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bottles_bottle_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bottles_bottle_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bottles_bottle_number_seq" OWNED BY "public"."bottles"."bottle_number";



CREATE TABLE IF NOT EXISTS "public"."breweries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "logo_url" "text",
    "banner_url" "text",
    "founded_year" integer,
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "invite_code" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."breweries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brewery_feed" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brewery_feed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brewery_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "preferences" "jsonb" DEFAULT '{"notifications": {"email_new_brew": true, "email_new_rating": true, "email_new_message": true}}'::"jsonb"
);


ALTER TABLE "public"."brewery_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collected_caps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "brew_id" "uuid",
    "collected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collected_caps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "brew_id" "uuid",
    CONSTRAINT "likes_entity_check" CHECK (("brew_id" IS NOT NULL))
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "founded_year" integer,
    "location" "text",
    "bio" "text",
    "website" "text",
    "updated_at" timestamp with time zone,
    "logo_url" "text",
    "banner_url" "text",
    "tier" "text" DEFAULT 'hobby'::"text",
    "total_bottle_fills" integer DEFAULT 0,
    "total_profile_views" integer DEFAULT 0,
    "achievements" "jsonb" DEFAULT '[]'::"jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    CONSTRAINT "profiles_tier_check" CHECK (("tier" = ANY (ARRAY['lehrling'::"text", 'geselle'::"text", 'meister'::"text", 'legende'::"text", 'garage'::"text", 'micro'::"text", 'craft'::"text", 'industrial'::"text", 'hobby'::"text", 'braumeister'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "author_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ip_address" "text",
    "moderation_status" character varying(20) DEFAULT 'auto_approved'::character varying,
    "flagged_count" integer DEFAULT 0,
    CONSTRAINT "ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bottles" ALTER COLUMN "bottle_number" SET DEFAULT "nextval"('"public"."bottles_bottle_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breweries"
    ADD CONSTRAINT "breweries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breweries"
    ADD CONSTRAINT "breweries_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."brewery_feed"
    ADD CONSTRAINT "brewery_feed_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_brewery_id_user_id_key" UNIQUE ("brewery_id", "user_id");



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_user_id_brew_id_key" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_brew_id_ip_address_key" UNIQUE ("brew_id", "ip_address");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "unique_user_brew_like" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



CREATE UNIQUE INDEX "breweries_invite_code_idx" ON "public"."breweries" USING "btree" ("invite_code");



CREATE INDEX "brews_data_abv_num_idx" ON "public"."brews" USING "btree" (((("data" ->> 'abv'::"text"))::numeric)) WHERE ("data" ? 'abv'::"text");



CREATE INDEX "brews_data_gin_idx" ON "public"."brews" USING "gin" ("data");



CREATE INDEX "brews_data_ibu_num_idx" ON "public"."brews" USING "btree" (((("data" ->> 'ibu'::"text"))::numeric)) WHERE (("brew_type" = 'beer'::"text") AND ("data" ? 'ibu'::"text"));



CREATE INDEX "idx_bottles_brew_id" ON "public"."bottles" USING "btree" ("brew_id");



CREATE INDEX "idx_brews_public" ON "public"."brews" USING "btree" ("is_public", "user_id") WHERE ("is_public" = true);



CREATE INDEX "idx_profiles_tier" ON "public"."profiles" USING "btree" ("tier");



CREATE INDEX "idx_user_achievements_achievement" ON "public"."user_achievements" USING "btree" ("achievement_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "likes_brew_id_idx" ON "public"."likes" USING "btree" ("brew_id");



CREATE INDEX "likes_user_id_idx" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "ratings_brew_id_idx" ON "public"."ratings" USING "btree" ("brew_id");



CREATE OR REPLACE TRIGGER "on_like_change" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_likes_count"();



CREATE OR REPLACE TRIGGER "on_like_notify" AFTER INSERT ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_like_notification"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_fills" AFTER UPDATE ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_fills"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_fills_insert" AFTER INSERT ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_fills_insert"();



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brewery_feed"
    ADD CONSTRAINT "brewery_feed_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_feed"
    ADD CONSTRAINT "brewery_feed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_remix_parent_id_fkey" FOREIGN KEY ("remix_parent_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Achievements können vergeben werden" ON "public"."user_achievements" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Achievements sind öffentlich lesbar" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Admins can remove members" ON "public"."brewery_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "brewery_members"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Allow update for owners" ON "public"."bottles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Anyone can create a profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Authenticated users can create breweries" ON "public"."breweries" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view all breweries" ON "public"."breweries" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view breweries" ON "public"."breweries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Brewers can delete ratings of their brews" ON "public"."ratings" FOR DELETE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));



CREATE POLICY "Brewers can update ratings of their brews" ON "public"."ratings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));



CREATE POLICY "Brews are viewable by everyone" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Enable insert access for all users" ON "public"."bottles" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert access for all users" ON "public"."brews" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."bottles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "Enable read access for members" ON "public"."breweries" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all users" ON "public"."bottles" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update access for all users" ON "public"."brews" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Everyone can view breweries" ON "public"."breweries" FOR SELECT USING (true);



CREATE POLICY "Jeder kann Ratings erstellen" ON "public"."ratings" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Members can create brewery brews" ON "public"."brews" FOR INSERT WITH CHECK (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can delete brewery brews" ON "public"."brews" FOR DELETE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can manage brewery bottles" ON "public"."bottles" USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can update brewery brews" ON "public"."brews" FOR UPDATE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can view brewery bottles" ON "public"."bottles" FOR SELECT USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Members can view brewery brews" ON "public"."brews" FOR SELECT USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("is_public" = true) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Mitglieder sehen ihre Brauerei" ON "public"."breweries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "breweries"."id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners and admins can add members" ON "public"."brewery_members" FOR INSERT WITH CHECK (("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = "auth"."uid"()) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners and admins can remove members" ON "public"."brewery_members" FOR DELETE USING ((("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = "auth"."uid"()) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) AND ("role" <> 'owner'::"text")));



CREATE POLICY "Owners and admins can update members" ON "public"."brewery_members" FOR UPDATE USING (("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = "auth"."uid"()) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners can delete their brewery" ON "public"."breweries" FOR DELETE USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Owners can update their brewery" ON "public"."breweries" FOR UPDATE USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public brews are viewable by everyone" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public view brewery members" ON "public"."brewery_members" FOR SELECT USING (true);



CREATE POLICY "Ratings sind öffentlich lesbar" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "Team members can insert feed items" ON "public"."brewery_feed" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Team members can view feed" ON "public"."brewery_feed" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "User can only see their own brews" ON "public"."brews" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User sehen eigene Achievements" ON "public"."user_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can add themselves to a brewery" ON "public"."brewery_members" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can add to their collection" ON "public"."collected_caps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own bottles" ON "public"."bottles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own brews" ON "public"."brews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own likes" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert themselves as members" ON "public"."brewery_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can join breweries" ON "public"."brewery_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave breweries" ON "public"."brewery_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only add to ther own bottles" ON "public"."bottles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only add to ther own brews" ON "public"."brews" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR true));



CREATE POLICY "Users can see their own bottles" ON "public"."bottles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own likes" ON "public"."likes" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their breweries" ON "public"."breweries" FOR SELECT USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own collection" ON "public"."collected_caps" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bottles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breweries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_feed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collected_caps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_brews_select" ON "public"."brews" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_brews_select" ON "public"."brews" FOR SELECT USING (("is_public" = true));



CREATE POLICY "public_profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "public_ratings_select" ON "public"."ratings" FOR SELECT USING ((("moderation_status")::"text" = 'auto_approved'::"text"));



ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brewery_feed";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_like_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_like_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_like_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_bottle_fills"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_bottle_fills_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."brews" TO "anon";
GRANT ALL ON TABLE "public"."brews" TO "authenticated";
GRANT ALL ON TABLE "public"."brews" TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "service_role";


















GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."bottles" TO "anon";
GRANT ALL ON TABLE "public"."bottles" TO "authenticated";
GRANT ALL ON TABLE "public"."bottles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."breweries" TO "anon";
GRANT ALL ON TABLE "public"."breweries" TO "authenticated";
GRANT ALL ON TABLE "public"."breweries" TO "service_role";



GRANT ALL ON TABLE "public"."brewery_feed" TO "anon";
GRANT ALL ON TABLE "public"."brewery_feed" TO "authenticated";
GRANT ALL ON TABLE "public"."brewery_feed" TO "service_role";



GRANT ALL ON TABLE "public"."brewery_members" TO "anon";
GRANT ALL ON TABLE "public"."brewery_members" TO "authenticated";
GRANT ALL ON TABLE "public"."brewery_members" TO "service_role";



GRANT ALL ON TABLE "public"."collected_caps" TO "anon";
GRANT ALL ON TABLE "public"."collected_caps" TO "authenticated";
GRANT ALL ON TABLE "public"."collected_caps" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow public updates to labels"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'labels'::text));



  create policy "Allow public uploads to labels"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'labels'::text));



  create policy "Allow uploads for authenticated users 1gnzyf3_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'labels'::text));



  create policy "Allow uploads for authenticated users 1gnzyf3_1"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'labels'::text));



  create policy "Allow uploads for authenticated users 1gnzyf3_2"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'labels'::text));



  create policy "Give public access to labels"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'labels'::text));



  create policy "Public Access Assets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'brewery-assets'::text));



  create policy "Public Read Access 1gnzyf3_0"
  on "storage"."objects"
  as permissive
  for select
  to anon
using ((bucket_id = 'labels'::text));



  create policy "User Update Assets"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'brewery-assets'::text) AND (auth.uid() = owner)));



  create policy "User Upload Assets"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'brewery-assets'::text) AND (auth.role() = 'authenticated'::text)));



