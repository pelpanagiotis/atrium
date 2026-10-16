import Link from "next/link";
import { Plug, RefreshCw, Search } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateMenu } from "@/components/create-menu";
import { WorkspaceSwitch } from "@/components/workspace-switch";
import type { WorkspaceSummary } from "@/server/workspaces/service";
import type { SessionUser } from "@/server/auth/session";

export function Shell({
  user,
  workspaces,
  current,
  theme,
  sidebarCollapsed = false,
  children,
}: {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  current: WorkspaceSummary;
  theme: "light" | "dark";
  sidebarCollapsed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <AppSidebar
        userName={user.name}
        current={{ kind: current.kind, icon: current.icon }}
        initialCollapsed={sidebarCollapsed}
      />
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex shrink-0 items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
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
            <CreateMenu />
            <HeaderAction href="/integrations" label="Integrations" icon={Plug} className="hidden sm:inline-flex" />
            <HeaderAction href="/sync" label="Sync" icon={RefreshCw} className="hidden sm:inline-flex" />
            <AccountMenu user={user} theme={theme} />
          </div>
          <nav className="flex gap-3 overflow-x-auto text-sm md:hidden">
            {[
              ["Home", "/home"],
              ["Projects", "/projects"],
              ["Tasks", "/tasks"],
              ["Calendar", "/calendar"],
            ].map(([label, href]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
        </header>
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-auto px-4 py-6 md:px-6">
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </main>
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
