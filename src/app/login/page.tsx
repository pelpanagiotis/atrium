"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/field";

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <AuthShell
      title="Sign in"
      description="Use the account you created on this Atrium server."
    >
      <form action={action} className="space-y-4 rounded-lg border border-border/80 bg-card/70 p-5 backdrop-blur-sm sm:p-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1" />
        </div>
        <label className="flex items-start gap-2.5 text-sm leading-snug">
          <Checkbox name="rememberMe" defaultChecked className="mt-0.5" />
          <span>
            Keep me signed in on this browser
            <span className="mt-0.5 block text-xs text-muted">Caches your session here for two weeks. Uncheck for a session that ends when you close the browser.</span>
          </span>
        </label>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button disabled={pending} type="submit" className="w-full sm:w-auto">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
