"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type ActionState } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerAction, {});
  return (
    <AuthShell
      title="Create your account"
      description="A personal workspace is created with you. Work workspaces stay separate until you invite someone."
    >
      <form action={action} className="space-y-4 rounded-lg border border-border/80 bg-card/70 p-5 backdrop-blur-sm sm:p-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="mt-1" autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1" autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={12} className="mt-1" autoComplete="new-password" />
          <p className="mt-1 text-xs text-muted">At least 12 characters, with a letter and a number.</p>
        </div>
        <label className="flex items-start gap-2 text-sm leading-snug">
          <input
            type="checkbox"
            name="rememberMe"
            defaultChecked
            className="mt-0.5 size-4 shrink-0 rounded border border-border bg-card accent-primary"
          />
          <span>
            Keep me signed in on this browser
            <span className="mt-0.5 block text-xs text-muted">Caches your session here for two weeks after you create the account.</span>
          </span>
        </label>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button disabled={pending} type="submit" className="w-full sm:w-auto">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
