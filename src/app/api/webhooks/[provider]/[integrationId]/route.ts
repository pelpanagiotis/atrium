import { receiveWebhook } from "@/server/webhooks/receive";
import type { ProviderId } from "@/server/integrations/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string; integrationId: string }> },
) {
  const { provider, integrationId } = await context.params;
  if (!["linear", "jira", "github", "fake"].includes(provider)) {
    return new Response("Unknown provider", { status: 404 });
  }
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const result = await receiveWebhook({
    provider: provider as ProviderId,
    integrationId,
    rawBody,
    headers,
  });
  return new Response(result.body, { status: result.status });
}
