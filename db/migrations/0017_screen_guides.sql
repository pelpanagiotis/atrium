-- Per-user record of which screen guides were dismissed, keyed by guide id.
-- The value is the guide version the user saw, so a guide whose content
-- changes is shown again on the next visit.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS guide_versions jsonb NOT NULL DEFAULT '{}'::jsonb;
