# Atrium

Atrium is a self-hosted desk for personal and work projects. Native tasks are edited here. Linear, Jira Cloud, GitHub, GitLab, and Gitea projects stay owned by those providers, and Atrium keeps a synchronized projection. Slack can be connected with a free bot token so the Chats page shows today's channel messages.

Workspaces are isolated. Roles are owner, admin, member, and viewer. The database enforces that with row-level security, and the server checks the same rules before every mutation.

## Run it locally

PostgreSQL 16 is required, with three roles:

- `atrium_migrator` — superuser, migrations only
- `atrium_app` — `NOSUPERUSER NOBYPASSRLS`
- `atrium_worker` — `NOSUPERUSER BYPASSRLS`

```bash
cp .env.example .env.local
# fill the URLs and generate both secrets with: openssl rand -base64 32
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://127.0.0.1:38471](http://127.0.0.1:38471).

Seeded accounts, both with password `atrium-demo-12`:

- `mira.vell@atrium.local` — Northwind Studio, plus a private Harbor Ledger workspace
- `jonas.reid@atrium.local` — member of Northwind Studio only

Set `EMBEDDED_WORKER=true` to process the sync queue inside `pnpm dev`. Otherwise run `pnpm worker` in another terminal.

## MCP (AI clients)

Atrium serves Model Context Protocol over Streamable HTTP at `/api/mcp`. Create a personal bearer token on **Integrations → MCP**, then point Cursor, Claude, ChatGPT, or any MCP client at:

```
{BETTER_AUTH_URL}/api/mcp
Authorization: Bearer atrium_mcp_…
```

Tools cover workspaces, projects, tasks, search, and workspace overview. Details are in [docs/MCP.md](docs/MCP.md).

## Provider OAuth

Paste tokens work out of the box. To use each provider’s authorize screen, register an OAuth app and set `{PROVIDER}_CLIENT_ID` / `{PROVIDER}_CLIENT_SECRET` in `.env.local`. Full steps are in [docs/OAUTH.md](docs/OAUTH.md).

### Slack chats (free plan)

1. Create an internal Slack app at [api.slack.com/apps](https://api.slack.com/apps).
2. Add bot scopes: `channels:history`, `channels:read`, `groups:history`, `groups:read`, `users:read`.
3. Install to your workspace and copy the bot token (`xoxb-…`).
4. In Atrium → Integrations → Slack, paste the token.
5. In Slack, `/invite @YourApp` into each channel you want on **Chats**.

Reading today's messages uses Slack's free plan (90-day history). No Slack paid plan is required.

```bash
pnpm oauth:redirects   # print callback URLs for your BETTER_AUTH_URL
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm db:migrate
pnpm test
pnpm test:e2e
```

`pnpm test` runs unit tests and Postgres integration tests. Point `.env.test` at a separate database such as `atrium_test` before running it. `pnpm test:e2e` drives Chromium against the dev server.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/BACKUP.md](docs/BACKUP.md), and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limits

- Hybrid ownership is reserved in the schema and rejected at runtime.
- GitHub issues do not support due dates or assignees from Atrium. Those controls are refused.
- Linear status changes need a workflow state UUID in the field mapping. A status name is not sent as a state id.
- Live Linear, Jira, GitHub, GitLab, and Gitea accounts are not contacted by the test suite. The fake provider and mocked HTTP clients cover the adapter and sync loop.
- Invitations are links, not email. The inviter sees the token once.
