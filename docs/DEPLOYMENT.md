# Deployment

Atrium runs as two processes against PostgreSQL 16. The Compose file is meant for Coolify with Traefik already on the host network. Do not point Coolify at a `convex deploy` workflow. This application does not use Convex.

## Services

- `postgres` creates `atrium_migrator` (superuser, migrations only), `atrium_app` (no bypass RLS), and `atrium_worker` (bypass RLS).
- `migrate` applies `db/migrations` once and exits.
- `app` serves Next.js on port 38471 and exposes `/api/health`.
- `worker` drains jobs and the outbox. Leave `EMBEDDED_WORKER` unset in production so the web process does not also hold the worker connection.

Traefik labels route `Host(\`${ATRIUM_HOST}\`)` to port 38471 with TLS. Set `BETTER_AUTH_URL` to the public https origin. Coolify should terminate TLS at Traefik and forward the original host.

## Environment

Copy `.env.example`. Generate:

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -base64 32   # CREDENTIAL_ENCRYPTION_KEY
```

Role passwords must not contain single quotes. They are interpolated by `docker/postgres/init.sh` on the first database boot only.

OAuth client ids are optional. Without them, an admin can paste a provider access token. That token is encrypted before it is stored. See [OAUTH.md](./OAUTH.md) for registering apps and callback URLs (`pnpm oauth:redirects`). Minimum scopes when OAuth is configured:

- Linear: `read`, `write`
- Jira: `read:jira-work`, `write:jira-work`, `offline_access`
- GitHub: classic `repo` (issues on private repositories)
- GitLab: `api`, `read_user`

## Local commands

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm worker
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

`pnpm dev` listens on `127.0.0.1:38471`. With `EMBEDDED_WORKER=true` in `.env.local`, the Next.js process also drains the queue so a second terminal is optional.

## Production build

```bash
docker compose build
docker compose up -d
```

The image runs `pnpm build` and `pnpm start`. The worker command is `pnpm worker` in the same image.
