import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { IntegrationsOnboarding } from "@/components/integrations-onboarding";
import { McpPanel } from "@/components/mcp-panel";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listIntegrations, oauthConfigured } from "@/server/integrations/service";
import { listAdapterProviders } from "@/server/integrations/registry";
import { CHAT_PROVIDERS, NOTE_PROVIDERS, type ProviderId } from "@/server/integrations/types";
import { listMcpTokens, mcpServerUrl } from "@/server/mcp/tokens";

export const instant = false;

export default function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <IntegrationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function IntegrationsContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { workspaces, current } = await workspaceContext(user.id);
  const [integrations, tokens] = await Promise.all([
    listIntegrations(user.id, current.id),
    listMcpTokens(user.id),
  ]);
  const canAdmin = current.role === "owner" || current.role === "admin";
  const providers = [
    ...listAdapterProviders().filter((provider) => provider !== "fake"),
    ...CHAT_PROVIDERS,
    ...NOTE_PROVIDERS,
  ];
  const oauth = Object.fromEntries(
    providers.map((provider) => {
      if (provider === "slack" || provider === "obsidian") return [provider, false] as const;
      return [provider, oauthConfigured(provider as Exclude<ProviderId, "fake">)] as const;
    }),
  );
  const params = await searchParams;
  return (
    <div className="space-y-10">
      <div data-tour="integrations-providers">
        <IntegrationsOnboarding
          workspaceId={current.id}
          integrations={integrations}
          providers={providers}
          oauth={oauth}
          canAdmin={canAdmin}
          error={params.error ?? null}
        />
      </div>
      <div data-tour="integrations-mcp">
        <McpPanel
          serverUrl={mcpServerUrl()}
          workspaces={workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
          tokens={tokens}
          currentWorkspaceId={current.id}
        />
      </div>
    </div>
  );
}
