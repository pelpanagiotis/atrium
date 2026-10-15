# Backup and restore

Back up the database and the credential key separately. A database dump contains ciphertext. Without `CREDENTIAL_ENCRYPTION_KEY`, those integrations cannot be decrypted. Do not put the key in the same archive as the dump.

## Dump

```bash
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL_MIGRATE" --file=atrium.dump
```

Use the migrator URL so row-level security does not hide rows. Store the dump where the application role cannot read it.

## Restore drill

```bash
createdb atrium_restore
pg_restore --no-owner --dbname=atrium_restore atrium.dump
```

Point a scratch `.env` at `atrium_restore` with the same encryption key and confirm:

- a member of workspace A cannot read workspace B
- an integration still reports `hasCredential` and can validate after you reconnect, or the ciphertext decrypts in a server-side check
- `schema_migrations` contains `0001_init.sql`

Drop `atrium_restore` after the drill.

## What else to keep

- The three role passwords.
- `BETTER_AUTH_SECRET`. Changing it signs everyone out. It does not decrypt provider credentials.
- OAuth client secrets, if you configured them.
- A note of the Postgres major version (16).

Take a dump before applying a new migration. Migrations run in a transaction and are recorded in `schema_migrations`.
