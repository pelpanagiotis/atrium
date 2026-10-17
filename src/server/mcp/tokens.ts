import { sql } from "drizzle-orm";
import { getDb, withUser } from "../db/client";
import { textArray } from "../db/sql";
import { randomToken, sha256 } from "../crypto/secrets";

export type McpScope = "read" | "write";

export type McpTokenRecord = {
  id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  name: string;
  token_prefix: string;
  scopes: McpScope[];
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
};

export type VerifiedMcpToken = {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  scopes: McpScope[];
};

const TOKEN_PREFIX = "atrium_mcp_";

function normalizeScopes(scopes: string[]): McpScope[] {
  const allowed = new Set<McpScope>(["read", "write"]);
  const next = [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))] as McpScope[];
  if (next.length === 0) throw new Error("Choose at least one scope");
  for (const scope of next) {
    if (!allowed.has(scope)) throw new Error(`Unsupported MCP scope: ${scope}`);
  }
  return next;
}

export async function listMcpTokens(userId: string): Promise<McpTokenRecord[]> {
  return withUser(userId, async (tx) => {
    return tx.execute<McpTokenRecord>(sql`
      select t.id, t.workspace_id, w.name as workspace_name, t.name, t.token_prefix, t.scopes,
             t.last_used_at, t.expires_at, t.created_at
      from mcp_tokens t
      left join workspaces w on w.id = t.workspace_id
      where t.user_id = current_setting('app.current_user_id', true)
        and t.revoked_at is null
      order by t.created_at desc
    `);
  });
}

export async function createMcpToken(
  userId: string,
  input: {
    name: string;
    workspaceId?: string | null;
    scopes?: string[];
    expiresInDays?: number | null;
  },
): Promise<{ id: string; token: string; prefix: string }> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) throw new Error("Token name must be between 1 and 80 characters");
  const scopes = normalizeScopes(input.scopes ?? ["read", "write"]);
  const workspaceId = input.workspaceId?.trim() || null;
  const expiresInDays = input.expiresInDays ?? null;
  if (expiresInDays !== null && (expiresInDays < 1 || expiresInDays > 3650)) {
    throw new Error("Expiry must be between 1 and 3650 days");
  }

  const secret = randomToken(32);
  const token = `${TOKEN_PREFIX}${secret}`;
  const prefix = token.slice(0, 18);
  const hash = sha256(token);
  const expiresAt =
    expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  return withUser(userId, async (tx) => {
    if (workspaceId) {
      const membership = await tx.execute<{ role: string }>(sql`
        select role from workspace_members
        where workspace_id = ${workspaceId}::uuid
          and user_id = current_setting('app.current_user_id', true)
      `);
      if (!membership[0]) throw new Error("You are not a member of that workspace");
    }

    const rows = await tx.execute<{ id: string }>(sql`
      insert into mcp_tokens (user_id, workspace_id, name, token_prefix, token_hash, scopes, expires_at)
      values (
        current_setting('app.current_user_id', true),
        ${workspaceId}::uuid,
        ${name},
        ${prefix},
        ${hash},
        ${textArray(scopes)},
        ${expiresAt}
      )
      returning id
    `);
    const id = rows[0]?.id;
    if (!id) throw new Error("Token was not created");
    return { id, token, prefix };
  });
}

export async function revokeMcpToken(userId: string, tokenId: string): Promise<void> {
  await withUser(userId, async (tx) => {
    const rows = await tx.execute(sql`
      update mcp_tokens
      set revoked_at = now()
      where id = ${tokenId}::uuid
        and user_id = current_setting('app.current_user_id', true)
        and revoked_at is null
      returning id
    `);
    if (!rows[0]) throw new Error("Token not found");
  });
}

export async function verifyMcpBearerToken(bearerToken?: string): Promise<VerifiedMcpToken | null> {
  const token = bearerToken?.trim();
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;

  const rows = await getDb().execute<{
    id: string;
    user_id: string;
    workspace_id: string | null;
    name: string;
    scopes: McpScope[];
  }>(sql`
    select id, user_id, workspace_id, name, scopes
    from lookup_mcp_token(${sha256(token)})
  `);
  const row = rows[0];
  if (!row) return null;

  // Best-effort last-used stamp; never block the request on it.
  void getDb()
    .execute(sql`select touch_mcp_token(${row.id}::uuid)`)
    .catch(() => undefined);

  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    name: row.name,
    scopes: row.scopes,
  };
}

export function mcpServerUrl(request?: Request): string {
  const configured = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  if (configured) return `${configured}/api/mcp`;
  if (request) {
    const url = new URL(request.url);
    return `${url.origin}/api/mcp`;
  }
  return "http://127.0.0.1:38471/api/mcp";
}
