import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { ensurePersonalWorkspace, listWorkspaces, type WorkspaceSummary } from "../workspaces/service";

export async function workspaceContext(userId: string): Promise<{
  workspaces: WorkspaceSummary[];
  current: WorkspaceSummary;
}> {
  const names = await getDb().execute<{ name: string }>(sql`select name from "user" where id = ${userId}`);
  await ensurePersonalWorkspace(userId, names[0]?.name ?? "Personal");
  const workspaces = await listWorkspaces(userId);
  const selected = (await cookies()).get("atrium_workspace")?.value;
  const current = workspaces.find((workspace) => workspace.id === selected) ?? workspaces[0];
  if (!current) {
    throw new Error("No workspace is available for this account");
  }
  return { workspaces, current };
}
