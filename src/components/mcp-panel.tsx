"use client";

import { useActionState, useState } from "react";
import { Bot, Copy, Check, KeyRound, Trash2 } from "lucide-react";
import { createMcpTokenAction, revokeMcpTokenAction, type ActionState } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

type WorkspaceOption = { id: string; name: string };
type TokenRow = {
  id: string;
  workspace_id: string | null;
  workspace_name: string | null;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: Date | string | null;
  expires_at: Date | string | null;
  created_at: Date | string;
};

function formatWhen(value: Date | string | null): string {
  if (!value) return "never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function McpPanel({
  serverUrl,
  workspaces,
  tokens,
  currentWorkspaceId,
}: {
  serverUrl: string;
  workspaces: WorkspaceOption[];
  tokens: TokenRow[];
  currentWorkspaceId: string;
}) {
  const [createState, createAction, creating] = useActionState<ActionState, FormData>(createMcpTokenAction, {});
  const [copied, setCopied] = useState<"url" | "token" | "cursor" | null>(null);
  const issuedToken = createState.token;

  async function copy(label: "url" | "token" | "cursor", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        atrium: {
          url: serverUrl,
          headers: {
            Authorization: "Bearer <paste-token-here>",
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">AI access</p>
          <h2 className="text-2xl">MCP</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Connect Cursor, Claude, ChatGPT, or any MCP client to this Atrium workspace. Tools can list workspaces,
            projects, and tasks, then create or update work with a personal token.
          </p>
        </div>
        <Badge tone="native">
          <Bot className="size-3.5" aria-hidden="true" />
          Streamable HTTP
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Server URL</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-2.5 py-2 text-xs">
              {serverUrl}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => void copy("url", serverUrl)}>
              {copied === "url" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            Clients send <code className="text-foreground">Authorization: Bearer atrium_mcp_…</code>
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Cursor config</p>
          <pre className="mt-2 overflow-x-auto rounded-md border bg-background p-3 text-xs leading-relaxed">
            {cursorConfig}
          </pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void copy("cursor", cursorConfig)}
          >
            {copied === "cursor" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy config
          </Button>
        </div>
      </div>

      {issuedToken ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" role="status">
          <p className="text-sm font-medium">Copy this token now. It will not be shown again.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-2.5 py-2 text-xs">
              {issuedToken}
            </code>
            <Button type="button" size="sm" onClick={() => void copy("token", issuedToken)}>
              {copied === "token" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy token
            </Button>
          </div>
        </div>
      ) : null}

      {createState.error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {createState.error}
        </p>
      ) : null}

      <form action={createAction} className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted" aria-hidden="true" />
          <h3 className="text-lg font-medium">Create access token</h3>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="mcp-name">Name</Label>
            <Input id="mcp-name" name="name" required maxLength={80} placeholder="Cursor on laptop" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="mcp-workspace">Workspace lock</Label>
            <select
              id="mcp-workspace"
              name="workspaceId"
              defaultValue={currentWorkspaceId}
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Any workspace I can access</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium">Scopes</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="scope_read" defaultChecked className="size-4 accent-primary" />
                Read projects and tasks
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="scope_write" defaultChecked className="size-4 accent-primary" />
                Create and update work
              </label>
            </div>
          </fieldset>
          <div>
            <Label htmlFor="mcp-expiry">Expires</Label>
            <select
              id="mcp-expiry"
              name="expiresInDays"
              defaultValue="365"
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={creating}>
          {creating ? "Creating…" : "Create token"}
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Active tokens</h3>
        {tokens.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card px-4 py-8 text-sm text-muted">
            No MCP tokens yet. Create one to connect an AI client.
          </p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((token) => (
              <li
                key={token.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{token.name}</p>
                  <p className="text-xs text-muted">
                    {token.token_prefix}… · {token.scopes.join(", ")} ·{" "}
                    {token.workspace_name ? token.workspace_name : "all workspaces"} · last used{" "}
                    {formatWhen(token.last_used_at)}
                  </p>
                </div>
                <form action={revokeMcpTokenAction}>
                  <input type="hidden" name="tokenId" value={token.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Revoke
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
