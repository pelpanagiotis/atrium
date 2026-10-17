"use client";

import type { CSSProperties } from "react";
import { Suspense, use, useActionState } from "react";
import { acceptInviteAction, type ActionState } from "@/app/actions";
import { PageMotion } from "@/components/page-motion";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInviteAction, {});
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex h-full min-h-0 max-w-md flex-col justify-center overflow-y-auto px-6">
          <h1 className="text-4xl">Accept invitation</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with the email address that received this invite, then confirm.
          </p>
        </main>
      }
    >
      <PageMotion>
        <main className="mx-auto flex h-full min-h-0 max-w-md flex-col justify-center overflow-y-auto px-6">
          <h1 className="text-4xl" data-reveal>
            Accept invitation
          </h1>
          <p className="mt-2 text-sm text-muted" data-reveal style={{ "--reveal-delay": "60ms" } as CSSProperties}>
            Sign in with the email address that received this invite, then confirm.
          </p>
          <form
            action={action}
            className="mt-6"
            data-reveal
            style={{ "--reveal-delay": "120ms" } as CSSProperties}
          >
            <input type="hidden" name="token" value={token} />
            {state.error ? <p className="mb-3 text-sm text-destructive">{state.error}</p> : null}
            <Button disabled={pending} type="submit">
              {pending ? "Joining…" : "Join workspace"}
            </Button>
          </form>
        </main>
      </PageMotion>
    </Suspense>
  );
}
