import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

// Read per request so the value comes from the running server's environment,
const corsHandler = metadataCorsOptionsRequestHandler();

export async function GET(request: Request) {
  const origin = process.env.BETTER_AUTH_URL?.replace(/\/$/, "") || "http://127.0.0.1:38471";
  const handler = protectedResourceHandler({
    // Bearer PAT auth only for now — clients discover the resource and send atrium_mcp_* tokens.
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  });
  return handler(request);
}

export { corsHandler as OPTIONS };
