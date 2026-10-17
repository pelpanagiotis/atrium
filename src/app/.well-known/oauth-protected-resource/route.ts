import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

const resourceUrl = process.env.BETTER_AUTH_URL
  ? `${process.env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/mcp`
  : "http://127.0.0.1:38471/api/mcp";

const handler = protectedResourceHandler({
  // Bearer PAT auth only for now — clients discover the resource and send atrium_mcp_* tokens.
  authServerUrls: [process.env.BETTER_AUTH_URL?.replace(/\/$/, "") || "http://127.0.0.1:38471"],
  resourceUrl,
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
