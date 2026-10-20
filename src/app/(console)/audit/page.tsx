import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthorizationError } from "@/server/authz/permissions";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listAudit } from "@/server/home/service";
import { formatWhen } from "@/lib/utils";

export const instant = false;

export default function AuditPage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <AuditContent />
    </Suspense>
  );
}

async function AuditContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  let denied = false;
  let rows: Awaited<ReturnType<typeof listAudit>> | null = null;
  try {
    rows = await listAudit(user.id, current.id);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    denied = true;
  }
  if (denied) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl">Audit is limited to owners and admins</h1>
        <p className="mt-2 text-sm text-muted">Your role in {current.name} is {current.role}.</p>
      </div>
    );
  }
  if (!rows || rows.length === 0) return <p className="text-sm text-muted">No audit events in {current.name} yet.</p>;
  return (
    <div>
      <h1 className="text-4xl">Audit</h1>
      <p className="mt-1 text-sm text-muted">Permission changes, integration changes, and important mutations. Secrets are not stored here.</p>
      <ul data-tour="audit-log" className="mt-4 divide-y rounded-lg border bg-card">
        {rows.map((row) => (
          <li key={String(row.id)} className="px-3 py-3 text-sm">
            <p className="font-medium">{String(row.action)}</p>
            <p className="text-muted">{String(row.actor_name ?? "Someone")} · {String(row.entity_type)} · {formatWhen(row.created_at as Date)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
