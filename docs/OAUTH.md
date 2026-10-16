# Provider OAuth setup

Atrium can connect Linear, Jira Cloud, GitHub, and GitLab through each provider’s authorize screen. Without OAuth client credentials, admins can still paste a personal access token.

OAuth is enabled per provider when both env vars are set:

```bash
{PROVIDER}_CLIENT_ID=...
{PROVIDER}_CLIENT_SECRET=...
```

`BETTER_AUTH_URL` must be the public origin Atrium is served from (no trailing slash). Callback URLs are derived from it:

```text
{BETTER_AUTH_URL}/api/integrations/oauth/{provider}/callback
```

Print the URLs for your current env:

```bash
pnpm oauth:redirects
```

## GitHub

1. Open [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**.
2. Application name: `Atrium` (or your deployment name).
3. Homepage URL: your `BETTER_AUTH_URL` (local: `http://127.0.0.1:38471`).
4. Authorization callback URL: `{BETTER_AUTH_URL}/api/integrations/oauth/github/callback`.
5. Create the app, then generate a **Client secret**.
6. Put both values in `.env.local`:

```bash
GITHUB_CLIENT_ID=Iv1...
GITHUB_CLIENT_SECRET=...
```

7. Restart `pnpm dev`.

Atrium requests the `repo` scope so private repository issues can sync. After authorize, you land on the integration page to link repositories.

## GitLab.com

1. Open [GitLab → Preferences → Applications](https://gitlab.com/-/user_settings/applications) (or a group/instance application).
2. Name: `Atrium`.
3. Redirect URI: `{BETTER_AUTH_URL}/api/integrations/oauth/gitlab/callback`.
4. Confidential: **Yes**.
5. Scopes: `api`, `read_user`.
6. Save, then copy **Application ID** and **Secret** into `.env.local`:

```bash
GITLAB_CLIENT_ID=...
GITLAB_CLIENT_SECRET=...
```

7. Restart `pnpm dev`.

OAuth targets `https://gitlab.com`. Self-managed GitLab can still connect with a personal access token and site URL on the token form.

## Linear

1. Create an OAuth application in the [Linear API settings](https://linear.app/settings/api).
2. Callback: `{BETTER_AUTH_URL}/api/integrations/oauth/linear/callback`.
3. Scopes used by Atrium: `read`, `write`.

```bash
LINEAR_CLIENT_ID=...
LINEAR_CLIENT_SECRET=...
```

## Jira Cloud

1. Create an OAuth 2.0 (3LO) app in the [Atlassian developer console](https://developer.atlassian.com/console/myapps/).
2. Callback: `{BETTER_AUTH_URL}/api/integrations/oauth/jira/callback`.
3. Scopes: `read:jira-work`, `write:jira-work`, `offline_access`.

```bash
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
```

## Local checklist

1. `BETTER_AUTH_URL` matches the browser origin (`http://127.0.0.1:38471` for `pnpm dev`).
2. Callback URLs in the provider consoles match `pnpm oauth:redirects` exactly.
3. Client id/secret are in `.env.local` and the Next.js process was restarted.
4. On **Integrations**, open a provider card — **Continue with … OAuth** appears when that provider is configured.
5. After consent, Atrium stores an encrypted credential and opens the integration so you can link projects.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No OAuth button | Missing `{PROVIDER}_CLIENT_ID` / `_CLIENT_SECRET`, or server not restarted |
| `redirect_uri` mismatch | Callback URL in the provider console differs from `BETTER_AUTH_URL` |
| OAuth state expired | Took longer than 15 minutes; start again from Integrations |
| Provider error query on `/integrations` | User denied consent, or the provider rejected the app settings |
