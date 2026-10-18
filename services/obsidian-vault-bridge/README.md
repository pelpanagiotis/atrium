# Atrium Obsidian vault bridge

Read-only HTTP bridge over a Self-hosted LiveSync filesystem mirror. Deploy it on the **vault VPS**; Atrium can run on any other host and connect with an HTTPS URL + token.

Compatible with Atrium’s existing Obsidian Local REST client (`GET /`, `GET /vault/…`).

## Why this exists

A filesystem vault path like `/root/vaults/THEVAULT` only works when Atrium shares that disk. When Atrium lives on a different VPS, expose the mirror through this bridge instead of installing Obsidian Local REST API.

## Deploy on the LiveSync VPS

1. Copy this folder to the VPS (or clone the Atrium repo).
2. Create `.env` with a long random `API_TOKEN` (≥8 chars).
3. Confirm the mirror path matches the compose volume (`/root/vaults/THEVAULT`).
4. Start:

```bash
docker compose up -d --build
```

5. Reverse-proxy `https://notes.example.com` → `http://127.0.0.1:27124` (TLS on port 443).
6. Smoke test:

```bash
curl -fsS -H "Authorization: Bearer $API_TOKEN" https://notes.example.com/
curl -fsS -H "Authorization: Bearer $API_TOKEN" https://notes.example.com/vault/
```

## Connect from Atrium (any host)

In **Integrations → Obsidian**:

| Field | Value |
| --- | --- |
| Vault path or Local REST URL | `https://notes.example.com` |
| Access token | same `API_TOKEN` as the bridge |

No `OBSIDIAN_VAULT_ROOT` is required on the Atrium host for this mode.

## Without Docker

```bash
VAULT_ROOT=/root/vaults/THEVAULT API_TOKEN='your-secret' PORT=27124 node server.mjs
```

## Security

- Read-only; no write/delete endpoints.
- Bearer token required on every request.
- Compose binds to `127.0.0.1` so the bridge is not public without your reverse proxy.
- Atrium only allows outbound HTTPS on port 443 to public hostnames.
