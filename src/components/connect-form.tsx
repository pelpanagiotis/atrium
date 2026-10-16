"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

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
  const selected = provider ?? providers[0] ?? "linear";
  const showJira = selected === "jira";
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
            <Select id="provider" name="provider" className="mt-1" defaultValue={selected}>
              {providers.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </div>
        ) : null}
        <div className={provider ? "md:col-span-2" : undefined}>
          <Label htmlFor="displayName">Connection name</Label>
          <Input id="displayName" name="displayName" required className="mt-1" placeholder={`${selected} workspace`} />
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
            placeholder={selected === "linear" ? "lin_api_…" : "Paste access token"}
          />
          {selected === "linear" ? (
            <p className="mt-1 text-xs text-muted">Paste a Linear personal API key as copied. Atrium sends that key without a Bearer prefix.</p>
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
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      <Button className="mt-1" disabled={pending} type="submit">{pending ? "Checking…" : "Test and save"}</Button>
    </form>
  );
}
