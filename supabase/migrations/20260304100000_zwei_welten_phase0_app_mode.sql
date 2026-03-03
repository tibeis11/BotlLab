-- ============================================================
-- ZWEI WELTEN Phase 0.1 — app_mode auf profiles
-- Fügt das zentrale Unterscheidungsfeld für Brauer vs. Trinker hinzu.
-- Additive Änderung: kein Breaking Change.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_mode TEXT NOT NULL DEFAULT 'drinker';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_mode_check
  CHECK (app_mode IN ('drinker', 'brewer'));

COMMENT ON COLUMN public.profiles.app_mode IS
  'Bestimmt die primäre UI-Experience:
   drinker = Consumer/My-Cellar-Welt (Default für alle neuen User)
   brewer  = Brauer/Team-Dashboard-Welt
   Upgrade von drinker → brewer erfolgt automatisch via Trigger bei Brewery-Beitritt.
   Downgrade ist nicht möglich (Brauer-Daten würden verwaisen).';

-- ============================================================
-- ZWEI WELTEN Phase 0.2 — handle_new_user() Trigger erweitern
-- Liest app_mode aus raw_user_meta_data.
-- Brauer-Signup setzt options.data.app_mode = 'brewer',
-- alle anderen Signups landen beim Default 'drinker'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    birthdate,
    app_mode,
    -- Premium fields:
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date,
    -- app_mode: explizit wenn im Signup-Form gesetzt (z.B. 'brewer' bei B2B-Startseite),
    -- sonst 'drinker' als sicherer Default (Consumer-Pfad)
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'app_mode' IN ('drinker', 'brewer')
        THEN NEW.raw_user_meta_data->>'app_mode'
        ELSE NULL
      END,
      'drinker'
    ),
    -- Premium defaults:
    'free',
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates profile for new user. Reads app_mode from raw_user_meta_data (brewer/drinker),
   defaults to drinker if not set. B2B-Signup-Form sets app_mode=brewer explicitly.';
