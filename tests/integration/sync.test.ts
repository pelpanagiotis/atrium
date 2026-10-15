import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { signHmacSha256 } from "@/server/crypto/secrets";
import { applyInboundTask, claimAndRun } from "@/server/sync/engine";
import { receiveWebhook } from "@/server/webhooks/receive";
import { connectWithToken, createExternalProject, disconnectIntegration, listIntegrations, listRemoteProjects, retryDead } from "@/server/integrations/service";
import { createNativeProject } from "@/server/projects/service";
import { createTask, listTasks, updateTask } from "@/server/tasks/service";
import { AuthorizationError } from "@/server/authz/permissions";
import { createWorkspace } from "@/server/workspaces/service";
import { getWorkerDb } from "@/server/db/client";
import { fakeProviderTasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { insertUser, resetDatabase, shutdown } from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await shutdown();
});

describe("fake provider synchronization", () => {
  it("pushes a task through the outbox and ignores a duplicate webhook", async () => {
    const user = await insertUser("Mira Vell", "mira-sync@example.com");
    const workspaceId = await createWorkspace(user, { name: "Northwind", kind: "work" });
    const integrationId = await connectWithToken(user, workspaceId, {
      provider: "fake",
      displayName: "Fake desk",
      accessToken: "fake-token-value",
      webhookSecret: "hook-secret",
    });
    const remote = await listRemoteProjects(user, workspaceId, integrationId);
    expect(remote).toEqual([]);
    await getWorkerDb().transaction(async (tx) => {
      await tx.execute(sql`
        insert into fake_provider_projects (integration_id, provider_project_id, name, key, url)
        values (${integrationId}::uuid, 'board-1', 'Board', 'BRD', 'https://fake.invalid/projects/board-1')
      `);
    });
    const projects = await listRemoteProjects(user, workspaceId, integrationId);
    expect(projects[0]?.providerId).toBe("board-1");
    const projectId = await createExternalProject(user, workspaceId, {
      integrationId,
      providerProjectId: "board-1",
      name: "Board",
      key: "BRD",
      url: "https://fake.invalid/projects/board-1",
    });
    const taskId = await createTask(user, workspaceId, {
      projectId,
      title: "Ship the gate",
      description: "External canonical copy",
      priority: "high",
    });
    const pending = await listTasks(user, workspaceId, {});
    expect(pending[0]?.sync_state).toBe("pending");
    expect(pending[0]?.provider).toBe("fake");
    const processed = await claimAndRun("test-worker");
    expect(processed).toBeGreaterThan(0);
    const synced = await listTasks(user, workspaceId, {});
    expect(synced[0]?.sync_state).toBe("synced");
    expect(synced[0]?.external_url).toContain("https://fake.invalid/issues/");
    const providerRows = await getWorkerDb().select().from(fakeProviderTasks).where(eq(fakeProviderTasks.integrationId, integrationId));
    expect(providerRows).toHaveLength(1);

    const raw = JSON.stringify({
      task: {
        providerId: providerRows[0]?.id,
        providerProjectId: "board-1",
        title: "Ship the gate",
        description: providerRows[0]?.description,
        status: "open",
        priority: "high",
        dueAt: null,
        assigneeProviderId: null,
        assigneeLabel: null,
        url: synced[0]?.external_url,
        updatedAt: new Date().toISOString(),
        archived: false,
        raw: {},
      },
    });
    const signature = signHmacSha256("hook-secret", raw).toString("hex");
    const headers = { "x-fake-signature": signature, "x-fake-delivery": "delivery-12345678" };
    const first = await receiveWebhook({ provider: "fake", integrationId, rawBody: raw, headers });
    const second = await receiveWebhook({ provider: "fake", integrationId, rawBody: raw, headers });
    expect(first).toEqual({ status: 200, body: "accepted" });
    expect(second).toEqual({ status: 200, body: "duplicate" });
    const bad = await receiveWebhook({
      provider: "fake",
      integrationId,
      rawBody: raw,
      headers: { "x-fake-signature": "00", "x-fake-delivery": "delivery-87654321" },
    });
    expect(bad.status).toBe(401);

    await claimAndRun("test-worker");
    const afterEcho = await listTasks(user, workspaceId, {});
    expect(afterEcho).toHaveLength(1);
    expect(afterEcho[0]?.title).toBe("Ship the gate");

    const version = afterEcho[0]?.version ?? 1;
    await updateTask(user, workspaceId, taskId, { version, title: "Ship the gate locally" });
    const conflict = await applyInboundTask({
      integrationId,
      workspaceId,
      provider: "fake",
      remote: {
        providerId: providerRows[0]!.id,
        providerProjectId: "board-1",
        title: "Ship the gate remotely",
        description: providerRows[0]!.description,
        status: "open",
        priority: "high",
        dueAt: null,
        assigneeProviderId: null,
        assigneeLabel: null,
        url: synced[0]?.external_url ?? null,
        updatedAt: new Date().toISOString(),
        archived: false,
        raw: {},
      },
    });
    expect(conflict).toBe("conflict");

    const views = await listIntegrations(user, workspaceId);
    expect(JSON.stringify(views)).not.toContain("fake-token-value");
    expect(views[0]?.hasCredential).toBe(true);
    await disconnectIntegration(user, workspaceId, integrationId);
    const disconnected = await listIntegrations(user, workspaceId);
    expect(disconnected[0]?.hasCredential).toBe(false);
    expect(disconnected[0]?.status).toBe("revoked");
    await expect(updateTask(user, workspaceId, taskId, { version: version + 1, title: "Too late" })).rejects.toThrow(/disconnected/);
  });

  it("dead-letters a exhausted job and lets an admin retry it", async () => {
    const owner = await insertUser("Owner", "owner-sync@example.com");
    const viewer = await insertUser("Viewer", "viewer-sync@example.com");
    const workspaceId = await createWorkspace(owner, { name: "Ops", kind: "work" });
    await createNativeProject(owner, workspaceId, { name: "Native" });
    const job = await getWorkerDb().execute<{ id: string }>(sql`
      insert into jobs (workspace_id, kind, payload, status, attempts, max_attempts)
      values (${workspaceId}::uuid, 'reconcile', '{}'::jsonb, 'pending', 8, 8)
      returning id
    `);
    const jobId = job[0]?.id;
    if (!jobId) throw new Error("job missing");
    await claimAndRun("test-worker");
    const dead = await getWorkerDb().execute<{ status: string }>(sql`select status from jobs where id = ${jobId}::uuid`);
    expect(dead[0]?.status).toBe("dead");
    await expect(retryDead(viewer, workspaceId, "job", jobId)).rejects.toBeInstanceOf(AuthorizationError);
    await retryDead(owner, workspaceId, "job", jobId);
    const retried = await getWorkerDb().execute<{ status: string; attempts: number }>(sql`
      select status, attempts from jobs where id = ${jobId}::uuid
    `);
    expect(retried[0]?.status).toBe("pending");
    expect(retried[0]?.attempts).toBe(0);
  });
});
