# MCP (Model Context Protocol)

Atrium exposes a Streamable HTTP MCP server so any MCP-capable AI client — Cursor, Claude, ChatGPT, custom agents — can read and write workspace work through tools.

## Endpoint

```
{BETTER_AUTH_URL}/api/mcp
```

Local default: `http://127.0.0.1:38471/api/mcp`

Authenticate every request with:

```http
Authorization: Bearer atrium_mcp_<token>
```

Create and revoke tokens on **Integrations → MCP**.

## Tools

| Tool | Scope | Purpose |
|------|-------|---------|
| `list_workspaces` | read | Workspaces the token holder can access |
| `list_projects` | read | Projects in a workspace |
| `create_project` | write | Create a native project |
| `list_tasks` | read | Filtered task list |
| `get_task` | read | Single task |
| `create_task` | write | Create a task |
| `update_task` | write | Update a task (requires `version`) |
| `search_workspace` | read | Search projects and tasks |
| `workspace_overview` | read | Dashboard stats and attention lists |

If a token is locked to one workspace, omit `workspaceId` on tool calls. Otherwise pass it explicitly.

## Cursor example

```json
{
  "mcpServers": {
    "atrium": {
      "url": "http://127.0.0.1:38471/api/mcp",
      "headers": {
        "Authorization": "Bearer atrium_mcp_…"
      }
    }
  }
}
```

For stdio-only clients, wrap the URL with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "atrium": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://127.0.0.1:38471/api/mcp", "--header", "Authorization: Bearer atrium_mcp_…"]
    }
  }
}
```

## Security

- Tokens are hashed (SHA-256) before storage. The plaintext is shown once at creation.
- Tokens inherit the user’s workspace membership and role checks (`task.read` / `task.write`, etc.).
- Optional workspace lock prevents cross-workspace access even if the user belongs to more workspaces.
- Requests are rate-limited per token (120/min).
- Revoke unused tokens from Integrations.

## Notes

- This is bearer-token resource auth, not a full OAuth authorization-server flow for third-party apps.
- Set `BETTER_AUTH_URL` to the public HTTPS origin in production so clients receive the correct resource URL.
