-- Set for accounts created after sign-up. The app sends them through the
-- onboarding flow before the rest of the console. Existing accounts default
-- to false, so they are never sent there.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS onboarding_pending boolean NOT NULL DEFAULT false;
