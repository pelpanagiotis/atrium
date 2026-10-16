import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="landing-shell">
      <div className="landing-gradient" aria-hidden="true" />
      <main className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-5xl grid-cols-1 items-center gap-10 overflow-y-auto px-6 py-12 md:grid-cols-2 md:gap-16 md:py-16">
        <header className="max-w-md md:pr-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Atrium</p>
          <h1 className="mt-3 text-4xl leading-tight md:text-5xl">{title}</h1>
          <p className="mt-3 text-base text-muted md:text-lg">{description}</p>
        </header>
        <div className="w-full max-w-md md:justify-self-end">{children}</div>
      </main>
    </div>
  );
}
