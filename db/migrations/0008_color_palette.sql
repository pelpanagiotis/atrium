ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS palette text NOT NULL DEFAULT 'grove';

ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_palette_check;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_palette_check
  CHECK (palette IN ('grove', 'harbor', 'ember', 'slate', 'dusk'));
