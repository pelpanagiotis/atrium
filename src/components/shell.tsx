import Link from "next/link";
import { Plus, Plug, RefreshCw, Search, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { WorkspaceSwitch } from "@/components/workspace-switch";
import type { WorkspaceSummary } from "@/server/workspaces/service";
import type { SessionUser } from "@/server/auth/session";

const LINKS = [
  ["Home", "/home"],
  ["Projects", "/projects"],
  ["Tasks", "/tasks"],
  ["Calendar", "/calendar"],
  ["Integrations", "/integrations"],
  ["Sync", "/sync"],
  ["Workspaces", "/workspaces"],
  ["Audit", "/audit"],
  ["Settings", "/settings"],
];

export function Shell({
  user,
  workspaces,
  current,
  children,
}: {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  current: WorkspaceSummary;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:flex md:flex-col md:justify-between md:p-4">
        <div>
          <Link href="/home" className="serif block px-2 text-2xl">Atrium</Link>
          <p className="px-2 pb-6 text-xs uppercase tracking-[0.18em] text-sidebar-foreground/60">{current.kind} workspace</p>
          <nav className="flex flex-col gap-1">
            {LINKS.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md px-2 py-2 text-sm hover:bg-white/10">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logoutAction}>
          <button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-white/10">{user.name}</button>
        </form>
      </aside>
      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/home" className="serif text-xl md:hidden">Atrium</Link>
            <WorkspaceSwitch currentId={current.id} workspaces={workspaces} />
          </div>
          <form action="/search" className="relative ml-auto w-full max-w-xs shrink">
            <label className="sr-only" htmlFor="global-search">Search</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="global-search"
              name="q"
              placeholder="Search"
              className="h-9 w-full rounded-md border bg-card py-1 pl-8 pr-3 text-sm"
            />
          </form>
          <div className="flex shrink-0 items-center gap-1">
            <HeaderAction href="/tasks" label="New task" icon={Plus} />
            <HeaderAction href="/integrations" label="Integrations" icon={Plug} className="hidden sm:inline-flex" />
            <HeaderAction href="/sync" label="Sync" icon={RefreshCw} className="hidden sm:inline-flex" />
            <HeaderAction href="/settings" label="Settings" icon={Settings} />
          </div>
          <nav className="flex gap-3 overflow-x-auto text-sm md:hidden">
            {LINKS.slice(0, 4).map(([label, href]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
        </header>
        <main className="w-full px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function HeaderAction({
  href,
  label,
  icon: Icon,
  className = "inline-flex",
}: {
  href: string;
  label: string;
  icon: typeof Search;
  className?: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`${className} size-9 items-center justify-center rounded-md border bg-card text-foreground transition hover:bg-accent`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Link>
  );
}
