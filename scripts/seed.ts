import { config } from "dotenv";

config({ path: ".env.local" });

const DEMO_PASSWORD = "atrium-demo-12";

async function ensureUser(email: string, name: string): Promise<string> {
  const { getAuth } = await import("../src/server/auth/auth");
  const { getDb } = await import("../src/server/db/client");
  const { sql } = await import("drizzle-orm");
  try {
    await getAuth().api.signUpEmail({ body: { email, password: DEMO_PASSWORD, name } });
  } catch {
    // The account already exists. The seed is safe to run again.
  }
  const rows = await getDb().execute<{ id: string }>(sql`select id from "user" where email = ${email}`);
  const id = rows[0]?.id;
  if (!id) throw new Error(`Could not seed ${email}`);
  return id;
}

async function main(): Promise<void> {
  const { closeDb } = await import("../src/server/db/client");
  const { ensurePersonalWorkspace, createWorkspace, inviteMember, acceptInvitation, listWorkspaces } = await import(
    "../src/server/workspaces/service"
  );
  const { createNativeProject } = await import("../src/server/projects/service");
  const { createTask } = await import("../src/server/tasks/service");

  const mira = await ensureUser("mira.vell@atrium.local", "Mira Vell");
  const jonas = await ensureUser("jonas.reid@atrium.local", "Jonas Reid");
  await ensurePersonalWorkspace(mira, "Mira Vell");
  await ensurePersonalWorkspace(jonas, "Jonas Reid");

  const miraSpaces = await listWorkspaces(mira);
  if (!miraSpaces.some((workspace) => workspace.name === "Northwind Studio")) {
    const workId = await createWorkspace(mira, { name: "Northwind Studio", kind: "work" });
    const launch = await createNativeProject(mira, workId, {
      name: "Launch board",
      description: "Native work owned by this workspace.",
    });
    const week = new Date();
    week.setUTCDate(week.getUTCDate() + 3);
    await createTask(mira, workId, {
      projectId: launch,
      title: "Confirm the vendor shortlist",
      description: "Three studios replied. Pick one before Friday.",
      priority: "urgent",
      status: "in_progress",
      dueAt: week.toISOString(),
    });
    await createTask(mira, workId, {
      projectId: launch,
      title: "Unblock the contract review",
      priority: "high",
      status: "blocked",
    });
    await createTask(mira, workId, {
      projectId: launch,
      title: "Publish the internal note",
      priority: "medium",
      status: "open",
    });
    const invite = await inviteMember(mira, workId, { email: "jonas.reid@atrium.local", role: "member" });
    await acceptInvitation(jonas, invite.token);
  }

  const refreshed = await listWorkspaces(mira);
  if (!refreshed.some((workspace) => workspace.name === "Harbor Ledger")) {
    const privateId = await createWorkspace(mira, { name: "Harbor Ledger", kind: "work" });
    const books = await createNativeProject(mira, privateId, {
      name: "Personal books",
      description: "Jonas is not a member of this workspace.",
    });
    await createTask(mira, privateId, {
      projectId: books,
      title: "File the quarter receipts",
      priority: "low",
      status: "open",
    });
  }

  console.log("Seeded Mira Vell and Jonas Reid.");
  console.log("Password for both accounts: atrium-demo-12");
  await closeDb();
}

void main();
