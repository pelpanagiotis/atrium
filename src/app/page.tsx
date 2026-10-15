import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">Self-hosted operations</p>
      <h1 className="mt-3 text-5xl leading-tight">One desk for personal work and the company backlog.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Atrium keeps native projects beside Linear, Jira, and GitHub. External tasks stay owned by the provider. Your workspaces stay isolated.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in</Link>
        <Link href="/register" className="rounded-md border bg-card px-4 py-2 text-sm">Create an account</Link>
      </div>
    </main>
  );
}
