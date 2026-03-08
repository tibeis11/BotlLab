-- Phase 3.2: Nonce table to prevent BTB replay attacks
-- Each QR token can only be used ONCE per bottle+brew combination.
-- When the bottle is refilled with a new brew, the same token works again.

CREATE TABLE IF NOT EXISTS btb_used_nonces (
  nonce      TEXT        NOT NULL,
  bottle_id  UUID        NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  brew_id    UUID        NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (nonce, bottle_id, brew_id)
);

-- RLS: only server-side access via service role
ALTER TABLE btb_used_nonces ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE btb_used_nonces IS 'Anti-replay nonces for Beat the Brewer. Each QR token can only be used once per bottle+brew pair.';
