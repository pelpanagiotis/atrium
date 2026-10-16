import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { IntegrationsOnboarding } from "@/components/integrations-onboarding";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listIntegrations, oauthConfigured } from "@/server/integrations/service";
import { listAdapterProviders } from "@/server/integrations/registry";

export const instant = false;

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <IntegrationsContent />
    </Suspense>
  );
}

async function IntegrationsContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const integrations = await listIntegrations(user.id, current.id);
  const canAdmin = current.role === "owner" || current.role === "admin";
  const providers = listAdapterProviders();
  const oauth = Object.fromEntries(
    providers
      .filter((provider) => provider !== "fake")
      .map((provider) => [provider, oauthConfigured(provider)]),
  );
  return (
    <IntegrationsOnboarding
      workspaceId={current.id}
      integrations={integrations}
      providers={providers}
      oauth={oauth}
      canAdmin={canAdmin}
    />
  );
}
