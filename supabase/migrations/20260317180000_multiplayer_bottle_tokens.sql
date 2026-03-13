-- ============================================================================
-- Migration: Multiplayer Bottle Tokens (User/Session based token burning)
-- ============================================================================
-- Instead of locking a specific bottle to a single event globally, we now allow 
-- multiple players to interact with the same bottle in a social setting.
-- 
-- Uniqueness is determined by:
-- [nonce + bottle_id + brew_id + session_id] + [user_id OR ip_hash]
-- ============================================================================

-- 1. Upgrade btb_used_nonces
DROP INDEX IF EXISTS public.unique_btb_nonce;

CREATE UNIQUE INDEX unique_btb_nonce ON public.btb_used_nonces (
  nonce,
  bottle_id,
  brew_id,
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(ip_hash, 'unknown_ip')
);

-- 2. Upgrade rating_used_nonces
DROP INDEX IF EXISTS public.unique_rating_nonce;

CREATE UNIQUE INDEX unique_rating_nonce ON public.rating_used_nonces (
  nonce,
  bottle_id,
  brew_id,
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(ip_hash, 'unknown_ip')
);

-- 3. Upgrade vibe_check_used_nonces
DROP INDEX IF EXISTS public.unique_vibe_check_nonce;

CREATE UNIQUE INDEX unique_vibe_check_nonce ON public.vibe_check_used_nonces (
  nonce,
  bottle_id,
  brew_id,
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(ip_hash, 'unknown_ip')
);