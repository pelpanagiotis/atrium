"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export function ConnectForm({
  workspaceId,
  providers,
  action,
}: {
  workspaceId: string;
  providers: string[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className="rounded-lg border bg-card p-4">
      <h2 className="text-xl">Connect with a token</h2>
      <p className="mt-1 text-sm text-muted">The token is encrypted before it is stored and is never sent back to the browser.</p>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="provider">Provider</Label>
          <Select id="provider" name="provider" className="mt-1">
            {providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" name="displayName" required className="mt-1" placeholder="Studio Linear" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="accessToken">Access token</Label>
          <Input id="accessToken" name="accessToken" type="password" required minLength={8} autoComplete="off" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="webhookSecret">Webhook secret</Label>
          <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="off" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="cloudId">Jira cloud id</Label>
          <Input id="cloudId" name="cloudId" className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="siteUrl">Jira site URL</Label>
          <Input id="siteUrl" name="siteUrl" placeholder="https://your-site.atlassian.net" className="mt-1" />
        </div>
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      <Button className="mt-3" disabled={pending} type="submit">{pending ? "Checking…" : "Test and save"}</Button>
    </form>
  );
}
