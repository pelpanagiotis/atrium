"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { connectTokenAction, disconnectAction, oauthStartAction, type ActionState } from "@/app/actions";
import { ConnectForm } from "@/components/connect-form";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type IntegrationRow = {
  id: string;
  provider: string;
  status: string;
  display_name: string;
  external_account_id: string | null;
  last_error: string | null;
  hasCredential: boolean;
};

const COPY: Record<string, string> = {
  linear: "Sync issues from Linear teams into Atrium projects.",
  jira: "Bring Jira Cloud projects and issues into this workspace.",
  github: "Track GitHub issues from repositories you choose.",
  gitlab: "Sync GitLab issues from projects you choose.",
};

export function IntegrationsOnboarding({
  workspaceId,
  integrations,
  providers,
  oauth,
  canAdmin,
}: {
  workspaceId: string;
  integrations: IntegrationRow[];
  providers: string[];
  oauth: Record<string, boolean>;
  canAdmin: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = integrations.filter((item) => item.status !== "revoked");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Onboarding</p>
        <h1 className="text-4xl">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Connect the tools your team already uses. Credentials stay encrypted on the server, and disconnecting removes the stored secret.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl">Configured</h2>
            <p className="text-sm text-muted">Open a connection to link projects and review sync health.</p>
          </div>
          <Badge tone={active.length ? "connected" : "neutral"}>{active.length} connected</Badge>
        </div>
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card px-4 py-8 text-sm text-muted">
            No providers yet. Choose one below to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {active.map((integration) => (
              <li key={integration.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                  <Link href={`/integrations/${integration.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <ProviderIcon provider={integration.provider} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium">{integration.display_name}</p>
                      <p className="truncate text-xs text-muted">
                        {providerLabel(integration.provider)}
                        {integration.external_account_id ? ` · ${integration.external_account_id}` : ""}
                        {integration.hasCredential ? " · secret stored" : " · secret removed"}
                      </p>
                      {integration.last_error ? <p className="text-xs text-destructive">{integration.last_error}</p> : null}
                    </div>
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge tone={integration.status}>{integration.status}</Badge>
                    {canAdmin ? (
                      <form action={disconnectAction}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="integrationId" value={integration.id} />
                        <Button variant="outline" type="submit">Disconnect</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl">Add a provider</h2>
          <p className="text-sm text-muted">Pick a platform to open its connection settings.</p>
        </div>
        {!canAdmin ? (
          <p className="text-sm text-muted">Only owners and admins can connect providers.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setSelected(provider)}
                className="rounded-xl border bg-card p-4 text-left transition hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ProviderIcon provider={provider} size="lg" />
                <p className="mt-3 text-lg font-medium capitalize">{providerLabel(provider)}</p>
                <p className="mt-1 text-sm text-muted">{COPY[provider] ?? "Connect this provider with a token or OAuth."}</p>
                <p className="mt-3 text-xs font-medium text-foreground/80">Configure →</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={selected} size="md" />
                  <div>
                    <DialogTitle>Connect {providerLabel(selected)}</DialogTitle>
                    <DialogDescription>
                      Save an access token for this workspace{oauth[selected] ? ", or continue with OAuth" : ""}.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {oauth[selected] ? (
                <form action={oauthStartAction}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="provider" value={selected} />
                  <Button type="submit" variant="outline" className="w-full">
                    Continue with {providerLabel(selected)} OAuth
                  </Button>
                </form>
              ) : null}
              <ConnectForm
                workspaceId={workspaceId}
                providers={[selected]}
                provider={selected}
                compact
                action={connectTokenAction as (state: ActionState, formData: FormData) => Promise<ActionState>}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
