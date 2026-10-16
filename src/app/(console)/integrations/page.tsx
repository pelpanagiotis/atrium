import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { connectTokenAction, disconnectAction, oauthStartAction } from "@/app/actions";
import { ConnectForm } from "@/components/connect-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl">Integrations</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Credentials stay encrypted on the server. Disconnecting a provider deletes the stored secret. OAuth uses the minimum scopes listed in the deployment notes.
        </p>
      </div>
      {integrations.length === 0 ? <p className="rounded-lg border border-dashed bg-card p-8 text-sm text-muted">No connections in this workspace yet.</p> : null}
      <ul className="space-y-3">
        {integrations.map((integration) => (
          <li key={integration.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div>
              <Link href={`/integrations/${integration.id}`} className="font-medium">{integration.display_name}</Link>
              <p className="text-xs text-muted">{integration.provider} · {integration.external_account_id ?? "no external account"} · secret {integration.hasCredential ? "stored" : "removed"}</p>
              {integration.last_error ? <p className="text-xs text-destructive">{integration.last_error}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={integration.status}>{integration.status}</Badge>
              {canAdmin && integration.status !== "revoked" ? (
                <form action={disconnectAction}>
                  <input type="hidden" name="workspaceId" value={current.id} />
                  <input type="hidden" name="integrationId" value={integration.id} />
                  <Button variant="outline" type="submit">Disconnect</Button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {canAdmin ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {listAdapterProviders().filter((provider) => provider !== "fake").map((provider) => (
              <form key={provider} action={oauthStartAction}>
                <input type="hidden" name="workspaceId" value={current.id} />
                <input type="hidden" name="provider" value={provider} />
                <Button type="submit" variant="outline" disabled={!oauthConfigured(provider)}>
                  {oauthConfigured(provider) ? `Connect ${provider} with OAuth` : `${provider} OAuth is not configured`}
                </Button>
              </form>
            ))}
          </div>
          <ConnectForm workspaceId={current.id} providers={listAdapterProviders()} action={connectTokenAction} />
        </div>
      ) : <p className="text-sm text-muted">Only owners and admins can connect providers.</p>}
    </div>
  );
}
