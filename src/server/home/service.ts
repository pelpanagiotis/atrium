import { sql } from "drizzle-orm";
import { requireAction } from "../authz/membership";
import { withUser } from "../db/client";

const STALE_MS = 15 * 60 * 1000;

export async function homeFeed(userId: string, workspaceId: string, now: number) {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    const weekEnd = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const priorities = await tx.execute(sql`
      select t.id, t.title, t.priority, t.status, t.due_at, p.name as project_name, t.provider, t.external_url
      from tasks t join projects p on p.id = t.project_id
      where t.workspace_id = ${workspaceId}::uuid
        and t.deleted_at is null
        and t.status in ('open', 'in_progress', 'blocked')
        and t.priority in ('urgent', 'high')
      order by case t.priority when 'urgent' then 0 else 1 end, t.due_at nulls last
      limit 8
    `);
    const dueSoon = await tx.execute(sql`
      select t.id, t.title, t.due_at, t.status, p.name as project_name, t.provider
      from tasks t join projects p on p.id = t.project_id
      where t.workspace_id = ${workspaceId}::uuid
        and t.deleted_at is null
        and t.status not in ('done', 'cancelled')
        and t.due_at is not null
        and t.due_at <= ${weekEnd}
      order by t.due_at
      limit 8
    `);
    const blocked = await tx.execute(sql`
      select t.id, t.title, p.name as project_name, t.provider
      from tasks t join projects p on p.id = t.project_id
      where t.workspace_id = ${workspaceId}::uuid and t.deleted_at is null and t.status = 'blocked'
      order by t.updated_at desc limit 8
    `);
    const activity = await tx.execute(sql`
      select id, direction as action, entity_type, provider_id as entity_id, created_at, status
      from sync_events
      where workspace_id = ${workspaceId}::uuid
      order by created_at desc limit 12
    `);
    const health = await tx.execute<{
      display_name: string;
      provider: string;
      status: string;
      last_success_at: Date | null;
      last_error: string | null;
    }>(sql`
      select i.display_name, i.provider, i.status, s.last_success_at, coalesce(s.last_error, i.last_error) as last_error
      from integrations i
      left join integration_sync_cursors s on s.integration_id = i.id and s.resource = 'issues'
      where i.workspace_id = ${workspaceId}::uuid and i.status <> 'revoked'
    `);
    const statsRows = await tx.execute<{
      open_count: number;
      in_progress_count: number;
      blocked_count: number;
      attention_count: number;
      due_soon_count: number;
      done_week_count: number;
      project_count: number;
      integration_count: number;
    }>(sql`
      select
        (select count(*)::int from tasks
          where workspace_id = ${workspaceId}::uuid and deleted_at is null and status = 'open') as open_count,
        (select count(*)::int from tasks
          where workspace_id = ${workspaceId}::uuid and deleted_at is null and status = 'in_progress') as in_progress_count,
        (select count(*)::int from tasks
          where workspace_id = ${workspaceId}::uuid and deleted_at is null and status = 'blocked') as blocked_count,
        (select count(*)::int from tasks
          where workspace_id = ${workspaceId}::uuid and deleted_at is null
            and status in ('open', 'in_progress', 'blocked')
            and priority in ('urgent', 'high')) as attention_count,
        (select count(*)::int from tasks
          where workspace_id = ${workspaceId}::uuid and deleted_at is null
            and status not in ('done', 'cancelled')
            and due_at is not null
            and due_at <= ${weekEnd}) as due_soon_count,
        (select count(*)::int from tasks
          where workspace_id = ${workspaceId}::uuid and deleted_at is null
            and status = 'done'
            and updated_at >= ${weekStart}) as done_week_count,
        (select count(*)::int from projects
          where workspace_id = ${workspaceId}::uuid and status = 'active') as project_count,
        (select count(*)::int from integrations
          where workspace_id = ${workspaceId}::uuid and status <> 'revoked') as integration_count
    `);
    const prefs = await tx.execute<{ notify_sync_errors: boolean }>(sql`
      select notify_sync_errors from user_preferences
      where user_id = current_setting('app.current_user_id', true)
    `);
    const showErrors = prefs[0]?.notify_sync_errors !== false;
    const stats = statsRows[0] ?? {
      open_count: 0,
      in_progress_count: 0,
      blocked_count: 0,
      attention_count: 0,
      due_soon_count: 0,
      done_week_count: 0,
      project_count: 0,
      integration_count: 0,
    };
    return {
      priorities,
      dueSoon,
      blocked,
      activity,
      weekEnd,
      stats: {
        open: stats.open_count,
        inProgress: stats.in_progress_count,
        blocked: stats.blocked_count,
        attention: stats.attention_count,
        dueSoon: stats.due_soon_count,
        doneWeek: stats.done_week_count,
        projects: stats.project_count,
        integrations: stats.integration_count,
      },
      health: health.map((row) => ({
        ...row,
        last_error: showErrors ? row.last_error : null,
        stale: row.status === "connected" && (!row.last_success_at || now - new Date(row.last_success_at).getTime() > STALE_MS),
      })),
    };
  });
}

export async function searchWorkspace(userId: string, workspaceId: string, query: string) {
  const term = query.trim();
  if (term.length < 2) return { projects: [], tasks: [] };
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    const like = `%${term}%`;
    const projects = await tx.execute(sql`
      select id, name, ownership_mode from projects
      where workspace_id = ${workspaceId}::uuid and name ilike ${like}
      order by name limit 8
    `);
    const tasks = await tx.execute(sql`
      select id, title, status, provider from tasks
      where workspace_id = ${workspaceId}::uuid and deleted_at is null and (title ilike ${like} or description ilike ${like})
      order by updated_at desc limit 8
    `);
    return { projects, tasks };
  });
}

export async function calendarTasks(userId: string, workspaceId: string, start: string, end: string) {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    return tx.execute(sql`
      select t.id, t.title, t.due_at, t.status, t.priority, t.provider, p.name as project_name
      from tasks t join projects p on p.id = t.project_id
      where t.workspace_id = ${workspaceId}::uuid
        and t.deleted_at is null
        and t.due_at >= ${new Date(start).toISOString()}
        and t.due_at < ${new Date(end).toISOString()}
      order by t.due_at
    `);
  });
}

export async function listAudit(userId: string, workspaceId: string) {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "audit.read");
    return tx.execute(sql`
      select a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at, u.name as actor_name
      from audit_events a
      left join "user" u on u.id = a.actor_user_id
      where a.workspace_id = ${workspaceId}::uuid
      order by a.created_at desc
      limit 200
    `);
  });
}
