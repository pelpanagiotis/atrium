"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function PasswordForm({
  action,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className={cn("max-w-xl space-y-3 rounded-lg border bg-card p-4 md:p-5", className)}>
      <h2 className="text-xl">Password</h2>
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={12} className="mt-1" />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.notice ? <p className="text-sm">{state.notice}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Updating…" : "Change password"}</Button>
    </form>
  );
}
