"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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

function SidebarTip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return <>{children}</>;
  return (
    <div className="group/tip relative">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2",
          "whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg",
          "opacity-0 translate-x-1 transition duration-150",
          "group-hover/tip:translate-x-0 group-hover/tip:opacity-100",
          "group-focus-within/tip:translate-x-0 group-focus-within/tip:opacity-100",
        )}
      >
        {label}
      </span>
    </div>
  );
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
  const workspaceLabel = `${current.kind === "personal" ? "Personal" : "Work"} workspace`;

  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-12 overflow-visible p-1.5" : "w-60 overflow-hidden p-4",
      )}
    >
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1",
          // Hover tips sit outside the rail; scrolling here would create a native horizontal bar.
          collapsed ? "overflow-visible" : "overflow-x-hidden overflow-y-auto",
        )}
      >
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "justify-between px-2")}>
          {!collapsed ? (
            <Link href="/home" className="serif text-2xl">
              Atrium
            </Link>
          ) : (
            <SidebarTip label="Atrium" show>
              <Link href="/home" className="serif text-base leading-none" aria-label="Atrium">
                A
              </Link>
            </SidebarTip>
          )}
          {!collapsed ? (
            <button
              type="button"
              onClick={toggle}
              className="inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-white/10 hover:text-sidebar-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <div className="mt-2 flex justify-center">
            <SidebarTip label="Expand sidebar" show>
              <button
                type="button"
                onClick={toggle}
                className="inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-white/10 hover:text-sidebar-foreground"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="size-4" aria-hidden="true" />
              </button>
            </SidebarTip>
          </div>
        ) : null}

        <div className={cn("mt-2 flex items-center gap-2 pb-4", collapsed ? "justify-center" : "px-2")}>
          <SidebarTip label={workspaceLabel} show={collapsed}>
            <WorkspaceIconBadge
              icon={current.icon}
              kind={current.kind}
              className="size-7 border-white/15 bg-white/5 text-xs text-sidebar-foreground"
            />
          </SidebarTip>
          {!collapsed ? (
            <p className="min-w-0 flex-1 text-xs uppercase leading-snug tracking-[0.14em] text-sidebar-foreground/60">
              {current.kind} workspace
            </p>
          ) : null}
        </div>

        <nav className="flex flex-col gap-0.5">
          {LINKS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <SidebarTip key={href} label={label} show={collapsed}>
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-md text-sm transition hover:bg-white/10",
                    collapsed ? "justify-center p-2" : "gap-3 px-2 py-2",
                    active && "bg-white/10",
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-90" aria-hidden="true" />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                </Link>
              </SidebarTip>
            );
          })}
        </nav>
      </div>

      <div className={cn("flex items-center gap-2", collapsed ? "justify-center py-1.5" : "px-2 py-2")}>
        <SidebarTip label={userName} show={collapsed}>
          <span
            aria-label={userName}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-medium"
          >
            {initials || "?"}
          </span>
        </SidebarTip>
        {!collapsed ? <span className="truncate text-sm text-sidebar-foreground/70">{userName}</span> : null}
      </div>
    </aside>
  );
}
