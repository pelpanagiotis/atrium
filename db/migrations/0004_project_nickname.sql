ALTER TABLE projects
  ADD COLUMN nickname text;

ALTER TABLE projects
  ADD CONSTRAINT projects_nickname_len CHECK (
    nickname IS NULL OR char_length(btrim(nickname)) BETWEEN 1 AND 80
  );

CREATE INDEX projects_nickname_trgm ON projects USING gin (nickname gin_trgm_ops);
