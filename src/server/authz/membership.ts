import { sql } from "drizzle-orm";
import type { Tx } from "../db/client";
import { assertCan, AuthorizationError, isWorkspaceRole, type Action, type WorkspaceRole } from "./permissions";

export async function currentRole(tx: Tx, workspaceId: string): Promise<WorkspaceRole> {
  const result = await tx.execute<{ role: string }>(sql`
    select role from workspace_members
    where workspace_id = ${workspaceId}::uuid
      and user_id = current_setting('app.current_user_id', true)
    limit 1
  `);
  const role = result[0]?.role;
  if (!role || !isWorkspaceRole(role)) {
    throw new AuthorizationError("You are not a member of this workspace");
  }
  return role;
}

export async function requireAction(tx: Tx, workspaceId: string, action: Action): Promise<WorkspaceRole> {
  const role = await currentRole(tx, workspaceId);
  assertCan(role, action);
  return role;
}
