"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/menu-select";

function providerLabel(provider: string): string {
  switch (provider) {
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "gitea":
      return "Gitea";
    case "linear":
      return "Linear";
    case "jira":
      return "Jira";
    default:
      return provider;
  }
}

export function ConnectForm({
  workspaceId,
  providers,
  action,
  provider,
  compact = false,
}: {
  workspaceId: string;
  providers: string[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  provider?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [selected, setSelected] = useState(provider ?? providers[0] ?? "linear");
  const showJira = selected === "jira";
  const showGitea = selected === "gitea";
  const showSiteUrl = selected === "gitlab" || showGitea;
  return (
    <form action={formAction} className={compact ? "space-y-3" : "rounded-lg border bg-card p-4"}>
      {!compact ? (
        <>
          <h2 className="text-xl">Connect with a token</h2>
          <p className="mt-1 text-sm text-muted">The token is encrypted before it is stored and is never sent back to the browser.</p>
        </>
      ) : null}
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {provider ? <input type="hidden" name="provider" value={provider} /> : null}
      <div className="mt-1 grid gap-3 md:grid-cols-2">
        {!provider ? (
          <div>
            <Label htmlFor="provider">Provider</Label>
            <MenuSelect
              id="provider"
              name="provider"
              className="mt-1"
              value={selected}
              onValueChange={setSelected}
              aria-label="Provider"
              options={providers.map((item) => ({
                value: item,
                label: providerLabel(item),
              }))}
            />
          </div>
        ) : null}
        <div className={provider ? "md:col-span-2" : undefined}>
          <Label htmlFor="displayName">Connection name</Label>
          <Input id="displayName" name="displayName" required className="mt-1" placeholder={`${providerLabel(selected)} workspace`} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="accessToken">Access token</Label>
          <Input
            id="accessToken"
            name="accessToken"
            type="password"
            required
            minLength={8}
            autoComplete="off"
            className="mt-1"
            placeholder={
              selected === "linear"
                ? "lin_api_…"
                : selected === "gitlab"
                  ? "glpat-…"
                  : selected === "gitea"
                    ? "Personal access token"
                    : "Paste access token"
            }
          />
          {selected === "linear" ? (
            <p className="mt-1 text-xs text-muted">Paste a Linear personal API key as copied. Atrium sends that key without a Bearer prefix.</p>
          ) : selected === "gitlab" ? (
            <p className="mt-1 text-xs text-muted">Paste a GitLab personal access token with the api scope. Self-managed instances can set a site URL below.</p>
          ) : selected === "gitea" ? (
            <p className="mt-1 text-xs text-muted">Paste a Gitea personal access token with issue and repository read/write. Set the site URL for self-hosted instances.</p>
          ) : (
            <p className="mt-1 text-xs text-muted">The token is encrypted before it is stored and is never sent back to the browser.</p>
          )}
        </div>
        <div className={showJira ? undefined : "md:col-span-2"}>
          <Label htmlFor="webhookSecret">Webhook secret</Label>
          <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="off" className="mt-1" />
        </div>
        {showJira ? (
          <>
            <div>
              <Label htmlFor="cloudId">Jira cloud id</Label>
              <Input id="cloudId" name="cloudId" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="siteUrl">Jira site URL</Label>
              <Input id="siteUrl" name="siteUrl" placeholder="https://your-site.atlassian.net" className="mt-1" />
            </div>
          </>
        ) : null}
        {showSiteUrl ? (
          <div className="md:col-span-2">
            <Label htmlFor="siteUrl">{showGitea ? "Gitea site URL" : "GitLab site URL"}</Label>
            <Input
              id="siteUrl"
              name="siteUrl"
              placeholder={showGitea ? "https://gitea.com" : "https://gitlab.com"}
              defaultValue={showGitea ? "https://gitea.com" : "https://gitlab.com"}
              key={showGitea ? "gitea-site" : "gitlab-site"}
              className="mt-1"
            />
          </div>
        ) : null}
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      <Button className="mt-1" disabled={pending} type="submit">{pending ? "Checking…" : "Test and save"}</Button>
    </form>
  );
}
