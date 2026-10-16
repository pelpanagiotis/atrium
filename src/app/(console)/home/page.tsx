import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Columns3,
  FolderKanban,
  ListTodo,
  Plug,
  RefreshCw,
} from "lucide-react";
import { HomeSourceFilter } from "@/components/home-source-filter";
import { ProviderIcon } from "@/components/provider-icon";
import { WorkspaceIconBadge } from "@/components/workspace-icon-picker";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { homeFeed } from "@/server/home/service";
import { formatWhen } from "@/lib/utils";

export const instant = false;

type HomeSearchParams = {
  source?: string;
};

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const params = await searchParams;
  // eslint-disable-next-line react-hooks/purity -- connection() already opted this request out of prerender
  const now = Date.now();
  const feed = await homeFeed(user.id, current.id, now, params.source);
  const source = feed.source;
  const sourceQuery = source ? `&source=${encodeURIComponent(source)}` : "";
  const dueBefore = feed.weekEnd;
  const staleCount = feed.health.filter((row) => row.stale || row.last_error).length;
  const attentionHref = `/tasks?priority=attention${sourceQuery}`;
  const dueSoonHref = `/tasks?dueBefore=${encodeURIComponent(dueBefore)}${sourceQuery}`;
  const blockedHref = `/tasks?status=blocked${sourceQuery}`;
  const openHref = `/tasks?status=open${sourceQuery}`;
  const inProgressHref = `/tasks?status=in_progress${sourceQuery}`;
  const doneHref = `/tasks?status=done${sourceQuery}`;
  const projectsHref = "/projects";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{current.kind}</p>
          <div className="mt-1 flex items-center gap-3">
            <WorkspaceIconBadge icon={current.icon} kind={current.kind} className="size-11 text-xl" />
            <h1 className="text-4xl">{current.name}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Workspace dashboard — open counts jump into filtered task lists, calendar, projects, and sync.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2 text-sm">
            <QuickLink href={`/tasks${source ? `?source=${encodeURIComponent(source)}` : ""}`} label="All tasks" icon={ListTodo} />
            <QuickLink href={`/tasks?view=board${sourceQuery}`} label="Board" icon={Columns3} />
            <QuickLink href="/calendar" label="Calendar" icon={CalendarDays} />
            <QuickLink href={projectsHref} label="Projects" icon={FolderKanban} />
            <QuickLink href="/integrations" label="Integrations" icon={Plug} />
            <QuickLink href="/sync" label="Sync" icon={RefreshCw} />
          </div>
          <HomeSourceFilter source={source} sources={feed.sources} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href={attentionHref}
          label="Needs attention"
          value={feed.stats.attention}
          hint="Urgent and high priority"
        />
        <StatCard
          href={dueSoonHref}
          label="Due this week"
          value={feed.stats.dueSoon}
          hint="Open work with a deadline"
        />
        <StatCard
          href={blockedHref}
          label="Blocked"
          value={feed.stats.blocked}
          hint="Waiting on a dependency"
        />
        <StatCard
          href={doneHref}
          label="Done this week"
          value={feed.stats.doneWeek}
          hint="Closed in the last seven days"
        />
        <StatCard href={openHref} label="Open" value={feed.stats.open} hint="Not started yet" />
        <StatCard
          href={inProgressHref}
          label="In progress"
          value={feed.stats.inProgress}
          hint="Actively being worked"
        />
        <StatCard href={projectsHref} label="Projects" value={feed.stats.projects} hint="Active in this workspace" />
        <StatCard
          href={staleCount ? "/sync" : "/integrations"}
          label="Integrations"
          value={feed.stats.integrations}
          hint={staleCount ? `${staleCount} need attention` : "Connected providers"}
          warn={staleCount > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Panel
          title="Needs attention"
          href={attentionHref}
          empty="Nothing urgent is open."
          count={feed.stats.attention}
        >
          {feed.priorities.map((task) => (
            <TaskLine
              key={String(task.id)}
              href={`${attentionHref}&q=${encodeURIComponent(String(task.title))}`}
              title={String(task.title)}
              provider={task.provider as string | null}
              tags={[
                { label: String(task.priority).replace("_", " "), tone: String(task.priority) },
                { label: String(task.project_name), tone: "project" },
              ]}
            />
          ))}
        </Panel>
        <Panel
          title="Due this week"
          href={dueSoonHref}
          secondaryHref="/calendar"
          secondaryLabel="Calendar"
          empty="No deadlines in the next seven days."
          count={feed.stats.dueSoon}
        >
          {feed.dueSoon.map((task) => (
            <TaskLine
              key={String(task.id)}
              href={`${dueSoonHref}&q=${encodeURIComponent(String(task.title))}`}
              title={String(task.title)}
              provider={task.provider as string | null}
              tags={[
                { label: formatWhen(task.due_at as Date), tone: "due" },
                { label: String(task.project_name), tone: "project" },
              ]}
            />
          ))}
        </Panel>
        <Panel
          title="Blocked"
          href={blockedHref}
          empty="No blocked tasks."
          count={feed.stats.blocked}
        >
          {feed.blocked.map((task) => (
            <TaskLine
              key={String(task.id)}
              href={`${blockedHref}&q=${encodeURIComponent(String(task.title))}`}
              title={String(task.title)}
              provider={task.provider as string | null}
              tags={[
                { label: "blocked", tone: "blocked" },
                { label: String(task.project_name), tone: "project" },
              ]}
            />
          ))}
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl">Sync health</h2>
            <Link href="/sync" className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground">
              Open sync
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          {feed.health.length === 0 ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted">
                {source === "atrium"
                  ? "Native Atrium work has no provider sync health."
                  : source
                    ? "This provider is not connected."
                    : "No provider is connected. Native work still lives here."}
              </p>
              {!source || source === "atrium" ? (
                <Link
                  href="/integrations"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition hover:underline"
                >
                  <Plug className="size-4" aria-hidden="true" />
                  Connect a provider
                </Link>
              ) : null}
            </div>
          ) : null}
          <ul className="mt-3 space-y-3">
            {feed.health.map((row) => (
              <li key={`${row.provider}:${row.display_name}`}>
                <Link
                  href="/integrations"
                  className="flex items-start justify-between gap-3 rounded-md px-1 py-1 text-sm transition hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <ProviderIcon provider={row.provider} />
                    <div className="min-w-0">
                      <p className="font-medium">{row.display_name}</p>
                      <p className="text-muted">
                        {row.last_error
                          ? row.last_error
                          : row.last_success_at
                            ? `Synced ${formatWhen(row.last_success_at)}`
                            : "Waiting for the first sync"}
                      </p>
                    </div>
                  </div>
                  <Badge tone={row.stale ? "error" : row.status}>{row.stale ? "stale" : row.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl">Recent sync activity</h2>
            <Link href="/sync" className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground">
              View sync
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          {feed.activity.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {source === "atrium"
                ? "Native tasks do not produce provider sync events."
                : "Synchronization events will show up here."}
            </p>
          ) : null}
          <ul className="mt-3 space-y-2 text-sm">
            {feed.activity.map((row) => (
              <li key={String(row.id)} className="flex justify-between gap-3">
                <span>
                  {String(row.action)} {String(row.entity_type)} · {String(row.status)}
                </span>
                <span className="text-muted">{formatWhen(row.created_at as Date)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof ListTodo;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-foreground transition hover:bg-accent"
    >
      <Icon className="size-3.5 text-muted" aria-hidden="true" />
      {label}
    </Link>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
  warn = false,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-4 transition hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        {warn ? <AlertTriangle className="size-3.5 text-rose-600" aria-hidden="true" /> : null}
      </div>
      <p className="mt-2 text-3xl font-medium tabular-nums">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted transition group-hover:text-foreground">
        {hint}
        <ArrowRight className="size-3 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
      </p>
    </Link>
  );
}

function Panel({
  title,
  href,
  secondaryHref,
  secondaryLabel,
  empty,
  count,
  children,
}: {
  title: string;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  const list = Array.isArray(children) ? children : [children];
  const filled = list.some(Boolean);
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{title}</h2>
          <p className="text-xs text-muted">{count} total</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link href={href} className="inline-flex items-center gap-1 font-medium transition hover:underline">
            View all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="text-xs text-muted transition hover:text-foreground">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
      {!filled ? <p className="mt-3 text-sm text-muted">{empty}</p> : <div className="mt-3 space-y-3">{children}</div>}
    </section>
  );
}

function TaskLine({
  title,
  tags,
  provider,
  href,
}: {
  title: string;
  tags: Array<{ label: string; tone: string }>;
  provider: string | null;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border/80 bg-background px-3 py-2.5 shadow-sm transition hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="font-medium leading-snug">{title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Badge key={`${tag.tone}-${tag.label}`} tone={tag.tone}>
            {tag.label}
          </Badge>
        ))}
        <ProviderIcon provider={provider} />
      </div>
    </Link>
  );
}
