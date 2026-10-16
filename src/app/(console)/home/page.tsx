import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ProviderIcon } from "@/components/provider-icon";
import { WorkspaceIconBadge } from "@/components/workspace-icon-picker";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { homeFeed } from "@/server/home/service";
import { formatWhen } from "@/lib/utils";

export const instant = false;

export default function HomePage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  // eslint-disable-next-line react-hooks/purity -- connection() already opted this request out of prerender
  const feed = await homeFeed(user.id, current.id, Date.now());
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{current.kind}</p>
        <div className="mt-1 flex items-center gap-3">
          <WorkspaceIconBadge icon={current.icon} kind={current.kind} className="size-11 text-xl" />
          <h1 className="text-4xl">{current.name}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Priorities, deadlines, and sync health for this workspace. Records from a provider stay labeled and link back to the source.
        </p>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Panel title="Needs attention" empty="Nothing urgent is open.">
          {feed.priorities.map((task) => (
            <TaskLine
              key={String(task.id)}
              href={`/tasks?q=${encodeURIComponent(String(task.title))}`}
              title={String(task.title)}
              provider={task.provider as string | null}
              tags={[
                { label: String(task.priority).replace("_", " "), tone: String(task.priority) },
                { label: String(task.project_name), tone: "project" },
              ]}
            />
          ))}
        </Panel>
        <Panel title="Due this week" empty="No deadlines in the next seven days.">
          {feed.dueSoon.map((task) => (
            <TaskLine
              key={String(task.id)}
              href="/calendar"
              title={String(task.title)}
              provider={task.provider as string | null}
              tags={[
                { label: formatWhen(task.due_at as Date), tone: "due" },
                { label: String(task.project_name), tone: "project" },
              ]}
            />
          ))}
        </Panel>
        <Panel title="Blocked" empty="No blocked tasks.">
          {feed.blocked.map((task) => (
            <TaskLine
              key={String(task.id)}
              href="/tasks?status=blocked"
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
          <h2 className="text-xl">Sync health</h2>
          {feed.health.length === 0 ? <p className="mt-3 text-sm text-muted">No provider is connected. Native work still lives here.</p> : null}
          <ul className="mt-3 space-y-3">
            {feed.health.map((row) => (
              <li key={row.display_name} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{row.display_name}</p>
                  <p className="text-muted">{row.last_error ? row.last_error : row.last_success_at ? `Synced ${formatWhen(row.last_success_at)}` : "Waiting for the first sync"}</p>
                </div>
                <Badge tone={row.stale ? "error" : row.status}>{row.stale ? "stale" : row.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-xl">Recent sync activity</h2>
          {feed.activity.length === 0 ? <p className="mt-3 text-sm text-muted">Synchronization events will show up here.</p> : null}
          <ul className="mt-3 space-y-2 text-sm">
            {feed.activity.map((row) => (
              <li key={String(row.id)} className="flex justify-between gap-3">
                <span>{String(row.action)} {String(row.entity_type)} · {String(row.status)}</span>
                <span className="text-muted">{formatWhen(row.created_at as Date)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  const filled = list.some(Boolean);
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-xl">{title}</h2>
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
          <Badge key={`${tag.tone}-${tag.label}`} tone={tag.tone}>{tag.label}</Badge>
        ))}
        <ProviderIcon provider={provider} />
      </div>
    </Link>
  );
}
