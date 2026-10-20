import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyMcpRequest } from "@/server/mcp/auth";
import { registerAtriumMcpTools } from "@/server/mcp/tools";
import { mcpServerUrl } from "@/server/mcp/tokens";

const handler = createMcpHandler(
  (server) => {
    registerAtriumMcpTools(server);
  },
  {
    serverInfo: {
      name: "atrium",
      version: "0.1.0",
    },
    instructions:
      "Atrium MCP server. Use list_workspaces first if the token is not workspace-locked, then call project/task tools with workspaceId. Prefer native projects for writes that should stay authoritative in Atrium.",
  },
);

// Built per request, so the public URL is read from the running server's
// environment rather than from the build.
function authHandler(request: Request): Promise<Response> {
  const wrapped = withMcpAuth(handler, verifyMcpRequest, {
    required: true,
    requiredScopes: ["read"],
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: process.env.BETTER_AUTH_URL
      ? `${process.env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/mcp`
      : undefined,
  });
  return wrapped(request);
}

export async function GET(request: Request) {
  return authHandler(request);
}

export async function POST(request: Request) {
  return authHandler(request);
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id",
      "Access-Control-Max-Age": "86400",
      "X-Atrium-Mcp-Url": mcpServerUrl(request),
    },
  });
}
