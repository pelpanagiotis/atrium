import { sql } from "drizzle-orm";
import { withUser } from "../db/client";

export async function getSeenGuideVersions(userId: string): Promise<Record<string, number>> {
  return withUser(userId, async (tx) => {
    const rows = await tx.execute<{ guide_versions: Record<string, unknown> | null }>(sql`
      select guide_versions from user_preferences
      where user_id = current_setting('app.current_user_id', true)
    `);
    const stored = rows[0]?.guide_versions ?? {};
    return Object.fromEntries(
      Object.entries(stored).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
    );
  });
}

export async function markGuideSeen(userId: string, guideId: string, version: number): Promise<void> {
  await withUser(userId, async (tx) => {
    await tx.execute(sql`
      insert into user_preferences (user_id, timezone, theme, palette, notify_sync_errors, notify_assignments, guide_versions)
      values (
        current_setting('app.current_user_id', true),
        'UTC',
        'light',
        'grove',
        true,
        true,
        jsonb_build_object(${guideId}::text, ${version}::int)
      )
      on conflict (user_id) do update set
        guide_versions = user_preferences.guide_versions || excluded.guide_versions,
        updated_at = now()
    `);
  });
}
