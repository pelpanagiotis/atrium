-- The worker role reads workspace data for integrations and tests. Grants on
-- tables created after 0001 are not automatic, so grant it explicitly.
GRANT SELECT ON oauth_app_settings TO atrium_worker;
