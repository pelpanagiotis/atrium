"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerAction, {});
  return (
    <main className="mx-auto flex h-full min-h-0 overflow-y-auto max-w-md flex-col justify-center px-6">
      <h1 className="text-4xl">Create your account</h1>
      <p className="mt-2 text-sm text-muted">A personal workspace is created with you. Work workspaces stay separate until you invite someone.</p>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={12} className="mt-1" />
          <p className="mt-1 text-xs text-muted">At least 12 characters, with a letter and a number.</p>
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button disabled={pending} type="submit">{pending ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-4 text-sm">Already registered? <Link href="/login" className="underline">Sign in</Link></p>
    </main>
  );
}
