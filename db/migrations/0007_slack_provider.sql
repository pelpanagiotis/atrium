-- Slack is a chat integration only; do not add it to tasks.provider.
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider = ANY (ARRAY[
    'linear'::text,
    'jira'::text,
    'github'::text,
    'gitlab'::text,
    'gitea'::text,
    'fake'::text,
    'slack'::text
  ]));
