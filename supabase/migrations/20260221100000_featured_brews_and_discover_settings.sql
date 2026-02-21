-- ============================================================================
-- Featured Brews + Discover Settings + Admin Quality RPCs
-- ============================================================================

-- 1. Add is_featured column to brews
ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_brews_featured
  ON public.brews (is_featured)
  WHERE is_featured = true;

-- 2. Platform Settings table (key/value, service-role only)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- No public access – only accessible via service_role (bypasses RLS)
DROP POLICY IF EXISTS "No public access on platform_settings" ON public.platform_settings;
CREATE POLICY "No public access on platform_settings"
  ON public.platform_settings
  USING (false);

-- Default settings
INSERT INTO public.platform_settings (key, value)
VALUES
  ('discover_min_quality_score', '0'),
  ('discover_featured_section_label', 'Empfohlen')
ON CONFLICT (key) DO NOTHING;

-- 3. Quality Score Distribution RPC
CREATE OR REPLACE FUNCTION public.get_quality_score_distribution()
RETURNS TABLE (bucket TEXT, bucket_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    CASE
      WHEN quality_score < 20  THEN '0–19'
      WHEN quality_score < 40  THEN '20–39'
      WHEN quality_score < 60  THEN '40–59'
      WHEN quality_score < 80  THEN '60–79'
      ELSE                          '80–100'
    END AS bucket,
    COUNT(*) AS bucket_count
  FROM public.brews
  WHERE is_public = true
  GROUP BY bucket
  ORDER BY MIN(quality_score);
$$;

GRANT EXECUTE ON FUNCTION public.get_quality_score_distribution() TO service_role;

-- 4. Low Quality Brews RPC
CREATE OR REPLACE FUNCTION public.get_low_quality_brews(threshold INT DEFAULT 40)
RETURNS TABLE (
  id UUID,
  name TEXT,
  style TEXT,
  quality_score INT,
  trending_score FLOAT8,
  is_featured BOOL,
  image_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id,
    b.name,
    b.style,
    b.quality_score,
    b.trending_score,
    b.is_featured,
    b.image_url,
    b.created_at
  FROM public.brews b
  WHERE b.is_public = true
    AND b.quality_score < threshold
  ORDER BY b.quality_score ASC, b.created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_low_quality_brews(INT) TO service_role;

-- 5. Admin: Override trending_score for a brew
CREATE OR REPLACE FUNCTION public.admin_set_trending_score(
  brew_id UUID,
  new_score FLOAT8
)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  UPDATE public.brews
  SET trending_score = new_score
  WHERE id = brew_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_trending_score(UUID, FLOAT8) TO service_role;

-- 6. Admin: Toggle featured flag for a brew
CREATE OR REPLACE FUNCTION public.admin_set_featured(
  brew_id UUID,
  featured BOOL
)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  UPDATE public.brews
  SET is_featured = featured
  WHERE id = brew_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_featured(UUID, BOOL) TO service_role;

-- 7. Public: Get featured brews (for Discover page SSR)
CREATE OR REPLACE FUNCTION public.get_featured_brews_public()
RETURNS TABLE (
  id UUID,
  name TEXT,
  style TEXT,
  image_url TEXT,
  quality_score INT,
  trending_score FLOAT8,
  likes_count INT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id,
    b.name,
    b.style,
    b.image_url,
    b.quality_score,
    b.trending_score,
    b.likes_count,
    b.created_at
  FROM public.brews b
  WHERE b.is_public = true
    AND b.is_featured = true
    AND b.moderation_status = 'approved'
  ORDER BY b.created_at DESC
  LIMIT 12;
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_brews_public()
  TO anon, authenticated, service_role;
