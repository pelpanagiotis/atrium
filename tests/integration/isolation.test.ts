import { afterAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { AuthorizationError } from "@/server/authz/permissions";
import { getWorkerDb } from "@/server/db/client";
import { retryDead } from "@/server/integrations/service";
import { createNativeProject, listProjects } from "@/server/projects/service";
import { createTask, listTasks, updateTask } from "@/server/tasks/service";
import { acceptInvitation, createWorkspace, inviteMember, listWorkspaces } from "@/server/workspaces/service";
import { insertUser, resetDatabase, shutdown } from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await shutdown();
});

describe("workspace isolation", () => {
  it("hides another workspace from the application and from direct SQL", async () => {
    const mira = await insertUser("Mira Vell", "mira@example.com");
    const jonas = await insertUser("Jonas Reid", "jonas@example.com");
    const miraWork = await createWorkspace(mira, { name: "Northwind", kind: "work" });
    const jonasWork = await createWorkspace(jonas, { name: "Harbor", kind: "work" });
    const projectId = await createNativeProject(mira, miraWork, { name: "Launch board", description: "Private" });
    const taskId = await createTask(mira, miraWork, { projectId, title: "Write the brief", priority: "high" });

    const invite = await inviteMember(mira, miraWork, { email: "jonas@example.com", role: "viewer" });
    await acceptInvitation(jonas, invite.token);

    await expect(listProjects(jonas, jonasWork)).resolves.toEqual([]);
    await expect(listProjects(jonas, miraWork)).resolves.toHaveLength(1);
    await expect(createNativeProject(jonas, miraWork, { name: "Sneaky" })).rejects.toBeInstanceOf(AuthorizationError);
    await expect(updateTask(jonas, miraWork, taskId, { version: 1, title: "Changed" })).rejects.toBeInstanceOf(AuthorizationError);

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    const db = postgres(url, { max: 1 });
    const anonymous = await db`select id from projects`;
    expect(anonymous).toHaveLength(0);
    const asJonas = await db.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${jonas}, true)`;
      const visible = await tx`select id from projects where workspace_id = ${jonasWork}::uuid`;
      const foreign = await tx`select id from projects where workspace_id = ${miraWork}::uuid`;
      const mutated = await tx`update tasks set title = 'stolen' where id = ${taskId}::uuid`;
      const projectMutated = await tx`update projects set name = 'stolen' where id = ${projectId}::uuid`;
      return { visible, foreign, taskCount: mutated.count, projectCount: projectMutated.count };
    });
    expect(asJonas.visible).toHaveLength(0);
    expect(asJonas.foreign.map((row) => row.id)).toContain(projectId);
    expect(asJonas.taskCount).toBe(0);
    expect(asJonas.projectCount).toBe(0);
    const still = await listTasks(mira, miraWork, {});
    expect(still[0]?.title).toBe("Write the brief");
    const miraSpaces = await listWorkspaces(mira);
    expect(miraSpaces.some((workspace) => workspace.id === jonasWork)).toBe(false);
    await db.end();
  });

  it("refuses invitations and dead-letter retries to a non-member in direct SQL", async () => {
    const mira = await insertUser("Mira Vell", "mira@example.com");
    const jonas = await insertUser("Jonas Reid", "jonas@example.com");
    const miraWork = await createWorkspace(mira, { name: "Northwind", kind: "work" });
    const jobs = await getWorkerDb().execute<{ id: string }>(sql`
      insert into jobs (workspace_id, kind, status) values (${miraWork}::uuid, 'reconcile', 'dead') returning id
    `);
    const outbox = await getWorkerDb().execute<{ id: string }>(sql`
      insert into outbox_events (workspace_id, operation_id, type, payload, status)
      values (${miraWork}::uuid, 'op-dead-letter', 'task.upsert', '{}'::jsonb, 'dead')
      returning id
    `);
    const jobId = jobs[0]?.id;
    const outboxId = outbox[0]?.id;
    if (!jobId || !outboxId) throw new Error("dead-letter rows missing");

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    const db = postgres(url, { max: 1 });
    const asJonas = (query: (tx: postgres.TransactionSql) => Promise<unknown>) =>
      db.begin(async (tx) => {
        await tx`select set_config('app.current_user_id', ${jonas}, true)`;
        return query(tx);
      });
    try {
      await expect(
        asJonas(async (tx) => {
          await tx`
            select create_invitation(${miraWork}::uuid, 'jonas@example.com', 'admin', 'self-invite', now() + interval '1 day')
          `;
          await tx`select accept_invitation('self-invite')`;
        }),
      ).rejects.toThrow(/Unauthorized/);
      await expect(asJonas((tx) => tx`select retry_dead_job(${jobId}::uuid)`)).rejects.toThrow(/Unauthorized/);
      await expect(asJonas((tx) => tx`select retry_dead_outbox(${outboxId}::uuid)`)).rejects.toThrow(/Unauthorized/);
    } finally {
      await db.end();
    }
    expect((await listWorkspaces(jonas)).some((workspace) => workspace.id === miraWork)).toBe(false);

    await retryDead(mira, miraWork, "job", jobId);
    await retryDead(mira, miraWork, "outbox", outboxId);
    const statuses = await getWorkerDb().execute<{ job: string; outbox: string }>(sql`
      select
        (select status from jobs where id = ${jobId}::uuid) as job,
        (select status from outbox_events where id = ${outboxId}::uuid) as outbox
    `);
    expect(statuses[0]).toEqual({ job: "pending", outbox: "pending" });
  });
});
