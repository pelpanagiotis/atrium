import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { AuthorizationError } from "@/server/authz/permissions";
import { getWorkerDb, withUser } from "@/server/db/client";
import { deleteOAuthApp, oauthAppOverview, resolveOAuthApp, saveOAuthApp } from "@/server/integrations/oauth-apps";
import { acceptInvitation, createWorkspace, inviteMember } from "@/server/workspaces/service";
import { insertUser, resetDatabase, shutdown } from "../helpers";

describe("workspace OAuth apps", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await shutdown();
  });

  it("stores encrypted credentials per workspace and hides them from members", async () => {
    const owner = await insertUser("Owner", "oauth-owner@example.com");
    const member = await insertUser("Member", "oauth-member@example.com");
    const workspaceId = await createWorkspace(owner, { name: "Ops", kind: "work" });
    const invite = await inviteMember(owner, workspaceId, { email: "oauth-member@example.com", role: "member" });
    await acceptInvitation(member, invite.token);

    await saveOAuthApp(owner, workspaceId, {
      provider: "linear",
      clientId: "linear-client",
      clientSecret: "linear-secret-value",
      siteUrl: "",
    });

    expect((await oauthAppOverview(owner, workspaceId)).linear).toEqual({
      source: "workspace",
      clientId: "linear-client",
      siteUrl: null,
    });
    expect((await oauthAppOverview(member, workspaceId)).linear.source).toBeNull();

    const stored = await getWorkerDb().execute<{ client_secret_ciphertext: string }>(sql`
      select client_secret_ciphertext from oauth_app_settings where workspace_id = ${workspaceId}::uuid
    `);
    expect(stored[0]?.client_secret_ciphertext).toBeTruthy();
    expect(stored[0]?.client_secret_ciphertext).not.toContain("linear-secret-value");

    const resolved = await withUser(owner, (tx) => resolveOAuthApp(tx, workspaceId, "linear"));
    expect(resolved).toEqual({
      clientId: "linear-client",
      clientSecret: "linear-secret-value",
      siteUrl: null,
      source: "workspace",
    });
  });

  it("refuses changes from members", async () => {
    const owner = await insertUser("Owner", "oauth-owner-2@example.com");
    const member = await insertUser("Member", "oauth-member-2@example.com");
    const workspaceId = await createWorkspace(owner, { name: "Ops", kind: "work" });
    const invite = await inviteMember(owner, workspaceId, { email: "oauth-member-2@example.com", role: "member" });
    await acceptInvitation(member, invite.token);

    await expect(
      saveOAuthApp(member, workspaceId, { provider: "github", clientId: "x", clientSecret: "y", siteUrl: "" }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("keeps the stored secret when the form leaves it blank, and falls back after removal", async () => {
    const owner = await insertUser("Owner", "oauth-owner-3@example.com");
    const workspaceId = await createWorkspace(owner, { name: "Ops", kind: "work" });

    await saveOAuthApp(owner, workspaceId, {
      provider: "linear",
      clientId: "first-client",
      clientSecret: "first-secret",
      siteUrl: "",
    });
    await saveOAuthApp(owner, workspaceId, {
      provider: "linear",
      clientId: "second-client",
      clientSecret: "",
      siteUrl: "",
    });
    const kept = await withUser(owner, (tx) => resolveOAuthApp(tx, workspaceId, "linear"));
    expect(kept).toMatchObject({ clientId: "second-client", clientSecret: "first-secret" });

    await deleteOAuthApp(owner, workspaceId, "linear");
    expect((await oauthAppOverview(owner, workspaceId)).linear.source).toBeNull();
  });

  it("requires a secret for a provider that has none stored", async () => {
    const owner = await insertUser("Owner", "oauth-owner-4@example.com");
    const workspaceId = await createWorkspace(owner, { name: "Ops", kind: "work" });

    await expect(
      saveOAuthApp(owner, workspaceId, { provider: "jira", clientId: "jira-client", clientSecret: "", siteUrl: "" }),
    ).rejects.toThrow("Enter the client secret");
  });

  it("uses server environment variables when the workspace has none", async () => {
    const owner = await insertUser("Owner", "oauth-owner-5@example.com");
    const workspaceId = await createWorkspace(owner, { name: "Ops", kind: "work" });
    process.env.GITHUB_CLIENT_ID = "env-github-client";
    process.env.GITHUB_CLIENT_SECRET = "env-github-secret";
    try {
      expect((await oauthAppOverview(owner, workspaceId)).github).toEqual({
        source: "environment",
        clientId: null,
        siteUrl: null,
      });
      const resolved = await withUser(owner, (tx) => resolveOAuthApp(tx, workspaceId, "github"));
      expect(resolved).toEqual({
        clientId: "env-github-client",
        clientSecret: "env-github-secret",
        siteUrl: null,
        source: "environment",
      });
    } finally {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
    }
  });
});
