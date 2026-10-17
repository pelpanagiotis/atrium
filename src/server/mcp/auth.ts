import type { AuthInfo } from "@modelcontextprotocol/server";
import { allowRequest } from "../rate-limit";
import { type McpScope, type VerifiedMcpToken, verifyMcpBearerToken } from "./tokens";

export type McpAuthExtra = {
  tokenId: string;
  userId: string;
  workspaceId: string | null;
  tokenName: string;
  scopes: McpScope[];
};

export function mcpAuthExtra(authInfo: AuthInfo | undefined): McpAuthExtra {
  const extra = authInfo?.extra as McpAuthExtra | undefined;
  if (!extra?.userId) throw new Error("Not authenticated");
  return extra;
}

export function requireMcpScope(extra: McpAuthExtra, scope: McpScope): void {
  if (!extra.scopes.includes(scope)) {
    throw new Error(`This MCP token is missing the "${scope}" scope`);
  }
}

export function resolveWorkspaceId(extra: McpAuthExtra, workspaceId?: string | null): string {
  const requested = workspaceId?.trim() || null;
  if (extra.workspaceId) {
    if (requested && requested !== extra.workspaceId) {
      throw new Error("This MCP token is locked to a different workspace");
    }
    return extra.workspaceId;
  }
  if (!requested) throw new Error("workspaceId is required for this token");
  return requested;
}

export async function verifyMcpRequest(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const verified = await verifyMcpBearerToken(bearerToken);
  if (!verified) return undefined;

  const allowed = await allowRequest(`mcp:${verified.id}`, 120, 60_000);
  if (!allowed) return undefined;

  return toAuthInfo(verified, bearerToken ?? "");
}

function toAuthInfo(verified: VerifiedMcpToken, token: string): AuthInfo {
  const extra: McpAuthExtra = {
    tokenId: verified.id,
    userId: verified.userId,
    workspaceId: verified.workspaceId,
    tokenName: verified.name,
    scopes: verified.scopes,
  };
  return {
    token,
    clientId: verified.id,
    scopes: verified.scopes,
    extra,
  };
}
