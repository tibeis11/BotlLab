
-- Fix Duplicate Indexes/Constraints
ALTER TABLE "public"."bottles" DROP CONSTRAINT IF EXISTS "bottles_id_key";
-- ALTER TABLE "public"."brews" DROP CONSTRAINT IF EXISTS "brews_id_key"; -- Skipped due to FK dependencies

-- Fix Auth RLS Initplan Issues (wrapping auth calls in select)

-- Table: public.user_achievements
ALTER POLICY "Achievements können vergeben werden" ON "public"."user_achievements" 
WITH CHECK ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "User sehen eigene Achievements" ON "public"."user_achievements" 
USING ((select auth.uid()) = user_id);


-- Table: public.brewery_members
ALTER POLICY "Admins can remove members" ON "public"."brewery_members" 
USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "brewery_members"."brewery_id") AND ("bm"."user_id" = (select auth.uid())) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

ALTER POLICY "Owners and admins can add members" ON "public"."brewery_members" 
WITH CHECK (("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = (select auth.uid())) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

ALTER POLICY "Owners and admins can remove members" ON "public"."brewery_members" 
USING ((("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = (select auth.uid())) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) AND ("role" <> 'owner'::"text")));

ALTER POLICY "Owners and admins can update members" ON "public"."brewery_members" 
USING (("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = (select auth.uid())) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

ALTER POLICY "Users can add themselves to a brewery" ON "public"."brewery_members" 
WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Users can insert themselves as members" ON "public"."brewery_members" 
WITH CHECK ("user_id" = (select auth.uid()));

ALTER POLICY "Users can join breweries" ON "public"."brewery_members" 
WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Users can leave breweries" ON "public"."brewery_members" 
USING ((select auth.uid()) = "user_id");


-- Table: public.bottles
ALTER POLICY "Allow update for owners" ON "public"."bottles" 
USING ((select auth.uid()) = "user_id") WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Enable insert access for all users" ON "public"."bottles" 
WITH CHECK ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Enable update access for all users" ON "public"."bottles" 
USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Members can view brewery bottles" ON "public"."bottles" 
USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("user_id" = (select auth.uid()))));

ALTER POLICY "Users can delete their own bottles" ON "public"."bottles" 
USING ((select auth.uid()) = "user_id");

ALTER POLICY "Users can only add to ther own bottles" ON "public"."bottles" 
WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Users can see their own bottles" ON "public"."bottles" 
USING ((select auth.uid()) = "user_id");


-- Table: public.profiles
ALTER POLICY "Anyone can create a profile" ON "public"."profiles" 
WITH CHECK ((select auth.uid()) = "id");

ALTER POLICY "Users can delete their own profile" ON "public"."profiles" 
USING ((select auth.uid()) = "id");

ALTER POLICY "Users can insert their own profile" ON "public"."profiles" 
WITH CHECK ((select auth.uid()) = "id");

ALTER POLICY "Users can read their own profile" ON "public"."profiles" 
USING (((select auth.uid()) = "id") OR true);

ALTER POLICY "Users can update their own profile" ON "public"."profiles" 
USING ((select auth.uid()) = "id");


-- Table: public.breweries
ALTER POLICY "Authenticated users can create breweries" ON "public"."breweries" 
WITH CHECK ((select auth.uid()) IS NOT NULL);

ALTER POLICY "Authenticated users can view all breweries" ON "public"."breweries" 
USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Mitglieder sehen ihre Brauerei" ON "public"."breweries" 
USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "breweries"."id") AND ("brewery_members"."user_id" = (select auth.uid()))))));

ALTER POLICY "Owners can delete their brewery" ON "public"."breweries" 
USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = (select auth.uid())) AND ("brewery_members"."role" = 'owner'::"text")))));

ALTER POLICY "Owners can update their brewery" ON "public"."breweries" 
USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = (select auth.uid())) AND ("brewery_members"."role" = 'owner'::"text")))));

ALTER POLICY "Users can view their breweries" ON "public"."breweries" 
USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."user_id" = (select auth.uid())))));


-- Table: public.ratings
ALTER POLICY "Brewers can delete ratings of their brews" ON "public"."ratings" 
USING (("auth"."uid"() IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));

ALTER POLICY "Brewers can update ratings of their brews" ON "public"."ratings" 
USING (("auth"."uid"() IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));

ALTER POLICY "Jeder kann Ratings erstellen" ON "public"."ratings" 
WITH CHECK ((select auth.role()) = 'authenticated'::text);


-- Table: public.brews
ALTER POLICY "Enable insert access for all users" ON "public"."brews" 
WITH CHECK ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Enable update access for all users" ON "public"."brews" 
USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Members can view brewery brews" ON "public"."brews" 
USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("is_public" = true) OR ("user_id" = (select auth.uid()))));

ALTER POLICY "User can only see their own brews" ON "public"."brews" 
USING ((select auth.uid()) = "user_id");

ALTER POLICY "Users can delete their own brews" ON "public"."brews" 
USING ((select auth.uid()) = "user_id");

ALTER POLICY "Users can only add to ther own brews" ON "public"."brews" 
WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "own_brews_select" ON "public"."brews" 
USING ((select auth.uid()) = "user_id");


-- Table: public.brewery_feed
ALTER POLICY "Team members can insert feed items" ON "public"."brewery_feed" 
WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = (select auth.uid()))))));

ALTER POLICY "Team members can view feed" ON "public"."brewery_feed" 
USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = (select auth.uid()))))));


-- Table: public.collected_caps
ALTER POLICY "Users can add to their collection" ON "public"."collected_caps" 
WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Users can view their own collection" ON "public"."collected_caps" 
USING ((select auth.uid()) = "user_id");


-- Table: public.notifications
ALTER POLICY "Users can delete own notifications" ON "public"."notifications" 
USING ((select auth.uid()) = "user_id");

ALTER POLICY "Users can update own notifications" ON "public"."notifications" 
USING ((select auth.uid()) = "user_id") WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Users can view own notifications" ON "public"."notifications" 
USING ((select auth.uid()) = "user_id");


-- Table: public.likes
ALTER POLICY "Users can delete their own likes" ON "public"."likes" 
USING ((select auth.uid()) = "user_id");

ALTER POLICY "Users can insert their own likes" ON "public"."likes" 
WITH CHECK ((select auth.uid()) = "user_id");

ALTER POLICY "Users can view own likes" ON "public"."likes" 
USING ((( SELECT (select auth.uid()) AS "uid") = "user_id"));
