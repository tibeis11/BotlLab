-- Rating System 2.0 Schema Extensions

-- Sensorische Attribute (Scale 1-10)
ALTER TABLE "public"."ratings" ADD COLUMN "taste_bitterness" INTEGER CHECK (taste_bitterness >= 1 AND taste_bitterness <= 10);
ALTER TABLE "public"."ratings" ADD COLUMN "taste_sweetness" INTEGER CHECK (taste_sweetness >= 1 AND taste_sweetness <= 10);
ALTER TABLE "public"."ratings" ADD COLUMN "taste_body" INTEGER CHECK (taste_body >= 1 AND taste_body <= 10);
ALTER TABLE "public"."ratings" ADD COLUMN "taste_carbonation" INTEGER CHECK (taste_carbonation >= 1 AND taste_carbonation <= 10);
ALTER TABLE "public"."ratings" ADD COLUMN "taste_acidity" INTEGER CHECK (taste_acidity >= 1 AND taste_acidity <= 10);

-- Flavor Tags (Array of strings)
ALTER TABLE "public"."ratings" ADD COLUMN "flavor_tags" TEXT[];

-- Appearance (Optional)
ALTER TABLE "public"."ratings" ADD COLUMN "appearance_color" TEXT; -- 'pale', 'amber', 'dark'
ALTER TABLE "public"."ratings" ADD COLUMN "appearance_clarity" TEXT; -- 'clear', 'hazy', 'opaque'

-- Aroma Intensity (1-10)
ALTER TABLE "public"."ratings" ADD COLUMN "aroma_intensity" INTEGER CHECK (aroma_intensity >= 1 AND aroma_intensity <= 10);

-- Indices for performance (as noted in Technical Debt section, good to add now)
CREATE INDEX idx_ratings_brew_taste ON "public"."ratings"(brew_id) WHERE taste_bitterness IS NOT NULL;
CREATE INDEX idx_ratings_flavor_tags ON "public"."ratings" USING GIN(flavor_tags);
