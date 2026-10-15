import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { completeOAuth } from "@/server/integrations/service";
import type { ProviderId } from "@/server/integrations/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { provider } = await context.params;
  if (provider !== "linear" && provider !== "jira" && provider !== "github") {
    return new Response("Unknown provider", { status: 404 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) redirect(`/integrations?error=${encodeURIComponent(oauthError)}`);
  if (!code || !state) return new Response("Missing OAuth code", { status: 400 });
  const result = await completeOAuth(user.id, provider as Exclude<ProviderId, "fake">, code, state);
  redirect(`/integrations/${result.integrationId}`);
}
