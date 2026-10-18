import { sql } from "drizzle-orm";
import { requireAction } from "../authz/membership";
import { withUser } from "../db/client";
import { openCredential } from "../integrations/credentials";
import {
  getObsidianNote,
  listObsidianNotes,
  type ObsidianNote,
  type ObsidianNoteSummary,
} from "../integrations/obsidian";
import type { NoteProviderId } from "../integrations/types";

export type NoteConnectionSummary = {
  id: string;
  displayName: string;
  status: string;
  externalAccountId: string | null;
  lastError: string | null;
  hasCredential: boolean;
  siteUrl: string | null;
};

export type NotesBrowseResult = {
  connections: NoteConnectionSummary[];
  notes: Array<ObsidianNoteSummary & { integrationId: string; integrationName: string; provider: NoteProviderId }>;
  errors: Array<{ integrationId: string; message: string }>;
  active: ObsidianNote | null;
  activeIntegrationId: string | null;
};

function siteUrlFromCredential(ciphertext: string | null): string | null {
  if (!ciphertext) return null;
  const credentials = openCredential(ciphertext);
  return credentials?.siteUrl ?? null;
}

export async function listObsidianConnections(
  userId: string,
  workspaceId: string,
): Promise<NoteConnectionSummary[]> {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    const rows = await tx.execute<{
      id: string;
      display_name: string;
      status: string;
      external_account_id: string | null;
      last_error: string | null;
      credential_ciphertext: string | null;
    }>(sql`
      select id, display_name, status, external_account_id, last_error, credential_ciphertext
      from integrations
      where workspace_id = ${workspaceId}::uuid
        and provider = 'obsidian'
        and status <> 'revoked'
      order by display_name
    `);
    return rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      status: row.status,
      externalAccountId: row.external_account_id,
      lastError: row.last_error,
      hasCredential: Boolean(row.credential_ciphertext),
      siteUrl: siteUrlFromCredential(row.credential_ciphertext),
    }));
  });
}

export async function browseObsidianNotes(
  userId: string,
  workspaceId: string,
  options: { query?: string; folder?: string; path?: string; integrationId?: string } = {},
): Promise<NotesBrowseResult> {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    const rows = await tx.execute<{
      id: string;
      display_name: string;
      status: string;
      external_account_id: string | null;
      last_error: string | null;
      credential_ciphertext: string | null;
    }>(sql`
      select id, display_name, status, external_account_id, last_error, credential_ciphertext
      from integrations
      where workspace_id = ${workspaceId}::uuid
        and provider = 'obsidian'
        and status <> 'revoked'
      order by display_name
    `);

    const connections: NoteConnectionSummary[] = rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      status: row.status,
      externalAccountId: row.external_account_id,
      lastError: row.last_error,
      hasCredential: Boolean(row.credential_ciphertext),
      siteUrl: siteUrlFromCredential(row.credential_ciphertext),
    }));

    const notes: NotesBrowseResult["notes"] = [];
    const errors: NotesBrowseResult["errors"] = [];
    let active: ObsidianNote | null = null;
    let activeIntegrationId: string | null = null;
    const preferredId = options.integrationId?.trim() || null;
    const path = options.path?.trim() || null;

    for (const row of rows) {
      if (row.status !== "connected" || !row.credential_ciphertext) {
        if (row.last_error) errors.push({ integrationId: row.id, message: row.last_error });
        continue;
      }
      const credentials = openCredential(row.credential_ciphertext);
      if (!credentials) {
        errors.push({ integrationId: row.id, message: `${row.display_name}: credentials missing` });
        continue;
      }
      try {
        const listed = await listObsidianNotes(credentials.accessToken, credentials.siteUrl, {
          query: options.query,
          folder: options.folder,
        });
        for (const note of listed) {
          notes.push({
            ...note,
            integrationId: row.id,
            integrationName: row.display_name,
            provider: "obsidian",
          });
        }
        if (path && !active && (!preferredId || preferredId === row.id)) {
          active = await getObsidianNote(credentials.accessToken, credentials.siteUrl, path);
          activeIntegrationId = row.id;
        }
        await tx.execute(sql`
          update integrations
          set last_validated_at = now(), last_error = null, status = 'connected'
          where id = ${row.id}::uuid
        `);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not read Obsidian vault";
        errors.push({ integrationId: row.id, message: `${row.display_name}: ${message}` });
        await tx.execute(sql`
          update integrations
          set last_error = ${message}, status = 'error'
          where id = ${row.id}::uuid
        `);
      }
    }

    notes.sort((a, b) => a.path.localeCompare(b.path));
    return { connections, notes, errors, active, activeIntegrationId };
  });
}
