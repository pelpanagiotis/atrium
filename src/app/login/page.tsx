"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <main className="mx-auto flex h-full min-h-0 overflow-y-auto max-w-md flex-col justify-center px-6">
      <h1 className="text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Use the account you created on this Atrium server.</p>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1" />
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="mt-4 text-sm">New here? <Link href="/register" className="underline">Create an account</Link></p>
    </main>
  );
}
