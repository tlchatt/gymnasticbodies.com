-- Internal payment block list (owner-approved 2026-10-08). Applied by hand (raw SQL, like
-- support_fires) — not part of the drizzle-kit migration chain. Checked at every checkout route by
-- blockedPaymentReason() in lib/stripeServerFunction.js; written by banMember() in lib/blocklist.js.
CREATE TABLE IF NOT EXISTS blocked_payment_identities (
  id          serial PRIMARY KEY,
  type        text NOT NULL CHECK (type IN ('card_fingerprint', 'email', 'stripe_customer')),
  value       text NOT NULL,               -- emails stored lowercase
  reason      text,
  user_id     text,                        -- reference only (no FK): survives account deletion
  created_by  text,
  created_at  timestamp NOT NULL DEFAULT now(),
  UNIQUE (type, value)
);
