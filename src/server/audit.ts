import { sql } from "drizzle-orm";
import type { Tx } from "./db/client";
import { redact } from "./log";

export async function writeAudit(
  tx: Tx,
  event: {
    workspaceId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const metadata = JSON.stringify(redact(event.metadata ?? {}));
  await tx.execute(sql`
    select write_audit(
      ${event.workspaceId}::uuid,
      ${event.action},
      ${event.entityType},
      ${event.entityId ?? null},
      ${metadata}::jsonb
    )
  `);
}
