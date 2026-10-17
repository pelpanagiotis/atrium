ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS projects_layout jsonb;
