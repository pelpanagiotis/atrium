import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { resolveAction, retryAction } from "@/app/actions";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listSyncProblems, syncHealth } from "@/server/integrations/service";
import { formatWhen } from "@/lib/utils";

export const instant = false;

export default function SyncPage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <SyncContent />
    </Suspense>
  );
}

async function SyncContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  // eslint-disable-next-line react-hooks/purity -- connection() already opted this request out of prerender
  const now = Date.now();
  const health = await syncHealth(user.id, current.id);
  const problems = await listSyncProblems(user.id, current.id);
  const canRetry = current.role === "owner" || current.role === "admin";
  const canResolve = current.role !== "viewer";
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Sync</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Provider-owned projects accept remote changes unless an edit is still in flight. Native projects keep your value and open a conflict instead of overwriting it.
        </p>
      </div>
      <section data-tour="sync-health" className="grid gap-3 md:grid-cols-2">
        {health.length === 0 ? <p className="text-sm text-muted">Nothing is connected.</p> : null}
        {health.map((row) => {
          const stale = row.status === "connected" && (!row.last_success_at || now - new Date(row.last_success_at).getTime() > 15 * 60 * 1000);
          return (
            <article key={row.integration_id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProviderIcon provider={row.provider} size="md" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg">{row.display_name}</h2>
                    <p className="text-xs text-muted">{providerLabel(row.provider)}</p>
                  </div>
                </div>
                <Badge tone={stale ? "error" : row.status}>{stale ? "stale" : row.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">Last success: {formatWhen(row.last_success_at)}</p>
              {row.last_error ? <p className="text-sm text-destructive">{row.last_error}</p> : null}
            </article>
          );
        })}
      </section>
      <section data-tour="sync-conflicts">
        <h2 className="text-2xl">Conflicts</h2>
        {problems.conflicts.length === 0 ? <p className="mt-2 text-sm text-muted">No open conflicts.</p> : null}
        <ul className="mt-3 space-y-3">
          {problems.conflicts.map((conflict) => (
            <li key={String(conflict.id)} className="rounded-lg border bg-card p-4 text-sm">
              <p className="font-medium">{String(conflict.title ?? "Task")} · {String(conflict.field)}</p>
              <p className="mt-1 text-muted">Local {JSON.stringify(conflict.local_value)} / Provider {JSON.stringify(conflict.remote_value)}</p>
              {canResolve ? (
                <div className="mt-3 flex gap-2">
                  <form action={resolveAction}>
                    <input type="hidden" name="workspaceId" value={current.id} />
                    <input type="hidden" name="conflictId" value={String(conflict.id)} />
                    <input type="hidden" name="resolution" value="keep_local" />
                    <Button type="submit" variant="outline">Keep local</Button>
                  </form>
                  <form action={resolveAction}>
                    <input type="hidden" name="workspaceId" value={current.id} />
                    <input type="hidden" name="conflictId" value={String(conflict.id)} />
                    <input type="hidden" name="resolution" value="keep_remote" />
                    <Button type="submit" variant="outline">Keep provider</Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section data-tour="sync-dead">
        <h2 className="text-2xl">Dead letters</h2>
        {problems.deadJobs.length + problems.deadOutbox.length === 0 ? <p className="mt-2 text-sm text-muted">No failed jobs are waiting.</p> : null}
        <ul className="mt-3 space-y-2">
          {problems.deadOutbox.map((row) => (
            <DeadRow key={String(row.id)} kind="outbox" id={String(row.id)} label={String(row.type)} error={String(row.last_error ?? "")} workspaceId={current.id} canRetry={canRetry} />
          ))}
          {problems.deadJobs.map((row) => (
            <DeadRow key={String(row.id)} kind="job" id={String(row.id)} label={String(row.kind)} error={String(row.last_error ?? "")} workspaceId={current.id} canRetry={canRetry} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function DeadRow({ kind, id, label, error, workspaceId, canRetry }: { kind: string; id: string; label: string; error: string; workspaceId: string; canRetry: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-destructive">{error}</p>
      </div>
      {canRetry ? (
        <form action={retryAction}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline">Retry</Button>
        </form>
      ) : <span className="text-xs text-muted">Admins can retry</span>}
    </li>
  );
}
