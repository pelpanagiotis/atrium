"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  FolderKanban,
  Home,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  RefreshCw,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { WorkspaceIconBadge } from "@/components/workspace-icon-picker";
import { cn } from "@/lib/utils";

const LINKS: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Sync", href: "/sync", icon: RefreshCw },
  { label: "Workspaces", href: "/workspaces", icon: Building2 },
  { label: "Audit", href: "/audit", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

const COOKIE = "atrium_sidebar";

function writeCollapsedCookie(collapsed: boolean) {
  document.cookie = `${COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
}

export function AppSidebar({
  userName,
  current,
  initialCollapsed = false,
}: {
  userName: string;
  current: { kind: "personal" | "work"; icon?: string | null };
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    writeCollapsedCookie(collapsed);
  }, [collapsed]);

  function toggle() {
    setCollapsed((value) => !value);
  }

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside
      className={cn(
        "hidden h-dvh shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px] p-2" : "w-60 p-4",
      )}
    >
      <div className="min-w-0">
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center px-0" : "justify-between px-2")}>
          {!collapsed ? (
            <Link href="/home" className="serif text-2xl">
              Atrium
            </Link>
          ) : (
            <Link href="/home" className="serif text-lg" aria-label="Atrium">
              A
            </Link>
          )}
          {!collapsed ? (
            <button
              type="button"
              onClick={toggle}
              className="inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-white/10 hover:text-sidebar-foreground"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex size-9 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-white/10 hover:text-sidebar-foreground"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className={cn("mt-3 flex items-center gap-2 pb-6", collapsed ? "justify-center px-0" : "px-2")}>
          <WorkspaceIconBadge
            icon={current.icon}
            kind={current.kind}
            className="size-8 border-white/15 bg-white/5 text-sm text-sidebar-foreground"
          />
          {!collapsed ? (
            <p className="truncate text-xs uppercase tracking-[0.18em] text-sidebar-foreground/60">
              {current.kind} workspace
            </p>
          ) : null}
        </div>

        <nav className="flex flex-col gap-1">
          {LINKS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm transition hover:bg-white/10",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-2 py-2",
                  active && "bg-white/10",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-90" aria-hidden="true" />
                {!collapsed ? <span className="truncate">{label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn("flex items-center gap-2", collapsed ? "justify-center px-0 py-2" : "px-2 py-2")}>
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-medium"
        >
          {initials || "?"}
        </span>
        {!collapsed ? <span className="truncate text-sm text-sidebar-foreground/70">{userName}</span> : null}
      </div>
    </aside>
  );
}
