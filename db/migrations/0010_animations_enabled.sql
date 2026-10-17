ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS animations_enabled boolean NOT NULL DEFAULT true;
