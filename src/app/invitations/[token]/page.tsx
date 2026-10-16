"use client";

import { useActionState } from "react";
import { use } from "react";
import { acceptInviteAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInviteAction, {});
  return (
    <main className="mx-auto flex h-full min-h-0 overflow-y-auto max-w-md flex-col justify-center px-6">
      <h1 className="text-4xl">Accept invitation</h1>
      <p className="mt-2 text-sm text-muted">Sign in with the email address that received this invite, then confirm.</p>
      <form action={action} className="mt-6">
        <input type="hidden" name="token" value={token} />
        {state.error ? <p className="mb-3 text-sm text-destructive">{state.error}</p> : null}
        <Button disabled={pending} type="submit">{pending ? "Joining…" : "Join workspace"}</Button>
      </form>
    </main>
  );
}
