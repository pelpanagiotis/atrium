ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS provider_tile_styles boolean NOT NULL DEFAULT true;
