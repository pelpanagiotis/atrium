"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createWorkspaceContextAction,
  deleteWorkspaceContextAction,
  type ActionState,
} from "@/app/actions";
import type { WorkspaceContextDef } from "@/lib/workspace-contexts";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function WorkspaceContextsManager({
  contexts,
  usage,
}: {
  contexts: WorkspaceContextDef[];
  usage: Record<string, number>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createWorkspaceContextAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.notice) formRef.current?.reset();
  }, [state.notice]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl">Contexts</h2>
        <p className="mt-1 text-sm text-muted">
          Group workspaces as personal, work, or any labels you add. Remove a context only when no workspace uses it.
        </p>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {contexts.map((context) => {
          const count = usage[context.slug] ?? 0;
          const canRemove = contexts.length > 1 && count === 0;
          return (
            <li key={context.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-lg"
                >
                  {context.icon ?? "🗂️"}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{context.label}</p>
                  <p className="text-xs text-muted">
                    {context.slug}
                    {" · "}
                    {count === 0 ? "Unused" : `${count} workspace${count === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              {canRemove ? (
                <form action={deleteWorkspaceContextAction}>
                  <input type="hidden" name="contextId" value={context.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </form>
              ) : (
                <p className="text-xs text-muted">
                  {count > 0 ? "In use" : "Required"}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div className="grid min-w-[12rem] flex-1 gap-2">
          <Label htmlFor="new-context-label">New context</Label>
          <Input
            id="new-context-label"
            name="label"
            placeholder="Side project"
            required
            maxLength={40}
          />
        </div>
        <input type="hidden" name="icon" value="🗂️" />
        <Button type="submit" disabled={pending}>
          <Plus className="size-3.5" aria-hidden="true" />
          {pending ? "Adding…" : "Add context"}
        </Button>
        {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
        {state.notice ? <p className="w-full text-sm text-muted">{state.notice}</p> : null}
      </form>
    </section>
  );
}
