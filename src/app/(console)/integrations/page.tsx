import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { IntegrationsOnboarding } from "@/components/integrations-onboarding";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listIntegrations, oauthConfigured } from "@/server/integrations/service";
import { listAdapterProviders } from "@/server/integrations/registry";
import { CHAT_PROVIDERS, type ProviderId } from "@/server/integrations/types";

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
  const { current } = await workspaceContext(user.id);
  const integrations = await listIntegrations(user.id, current.id);
  const canAdmin = current.role === "owner" || current.role === "admin";
  const providers = [
    ...listAdapterProviders().filter((provider) => provider !== "fake"),
    ...CHAT_PROVIDERS,
  ];
  const oauth = Object.fromEntries(
    providers.map((provider) => {
      if (provider === "slack") return [provider, false] as const;
      return [provider, oauthConfigured(provider as Exclude<ProviderId, "fake">)] as const;
    }),
  );
  const params = await searchParams;
  return (
    <IntegrationsOnboarding
      workspaceId={current.id}
      integrations={integrations}
      providers={providers}
      oauth={oauth}
      canAdmin={canAdmin}
      error={params.error ?? null}
    />
  );
}
