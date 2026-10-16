"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/server/auth/auth";
import { getSessionUser } from "@/server/auth/session";
import { allowRequest } from "@/server/rate-limit";
import { ensurePersonalWorkspace, createWorkspace, inviteMember, acceptInvitation, setMemberRole, removeMember, updateWorkspace } from "@/server/workspaces/service";
import { archiveProject, createMilestone, createNativeProject, updateProject } from "@/server/projects/service";
import { bulkUpdateTasks, createTask, updateTask } from "@/server/tasks/service";
import {
  addFakeRemoteProject,
  beginOAuth,
  connectWithToken,
  createExternalProject,
  disconnectIntegration,
  resolveConflict,
  retryDead,
  setNativePublishing,
  testIntegration,
  updateFieldMappings,
} from "@/server/integrations/service";
import { writeAudit } from "@/server/audit";
import { withUser } from "@/server/db/client";
import { sql } from "drizzle-orm";
import type { ProviderId } from "@/server/integrations/types";

export type ActionState = { error?: string; notice?: string; token?: string };

async function userId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in to continue");
  return user.id;
}

async function clientKey(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

const password = z.string().min(12, "Use at least 12 characters").regex(/[a-zA-Z]/, "Include a letter").regex(/[0-9]/, "Include a number");

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().email("Enter a valid email"),
    password,
  }).safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  if (!(await allowRequest(`auth:${await clientKey()}`, 10, 15 * 60 * 1000))) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }
  try {
    await auth.api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the account" };
  }
  const user = await getSessionUser();
  if (user) await ensurePersonalWorkspace(user.id, user.name);
  redirect("/home");
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const secret = String(formData.get("password") ?? "");
  if (!(await allowRequest(`auth:${await clientKey()}`, 10, 15 * 60 * 1000))) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }
  try {
    await auth.api.signInEmail({ body: { email, password: secret }, headers: await headers() });
  } catch {
    return { error: "Email or password is incorrect" };
  }
  const user = await getSessionUser();
  if (user) {
    await ensurePersonalWorkspace(user.id, user.name);
    await withUser(user.id, (tx) => writeAudit(tx, { workspaceId: null, action: "auth.signed_in", entityType: "user", entityId: user.id }));
  }
  redirect("/home");
}

export async function logoutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const id = String(formData.get("workspaceId") ?? "");
  const user = await userId();
  const { listWorkspaces } = await import("@/server/workspaces/service");
  const workspaces = await listWorkspaces(user);
  if (!workspaces.some((workspace) => workspace.id === id)) throw new Error("Workspace not found");
  (await cookies()).set("atrium_workspace", id, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  redirect("/home");
}

export async function createWorkspaceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const id = await createWorkspace(await userId(), {
      name: String(formData.get("name") ?? ""),
      kind: String(formData.get("kind") ?? "work") === "personal" ? "personal" : "work",
      icon: String(formData.get("icon") ?? ""),
    });
    (await cookies()).set("atrium_workspace", id, { httpOnly: true, sameSite: "lax", path: "/" });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the workspace" };
  }
  redirect("/workspaces");
}

export async function updateWorkspaceAction(formData: FormData): Promise<void> {
  await updateWorkspace(await userId(), String(formData.get("workspaceId")), {
    name: String(formData.get("name") ?? ""),
    icon: String(formData.get("icon") ?? ""),
  });
  redirect("/workspaces");
}

export async function inviteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = await inviteMember(await userId(), String(formData.get("workspaceId")), {
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "member") as "admin" | "member" | "viewer",
    });
    return { notice: "Invitation created. Share this link once. It is not stored in readable form.", token: result.token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not invite" };
  }
}

export async function acceptInviteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const workspaceId = await acceptInvitation(await userId(), String(formData.get("token") ?? ""));
    (await cookies()).set("atrium_workspace", workspaceId, { httpOnly: true, sameSite: "lax", path: "/" });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invitation could not be accepted" };
  }
  redirect("/home");
}

export async function roleAction(formData: FormData): Promise<void> {
  await setMemberRole(
    await userId(),
    String(formData.get("workspaceId")),
    String(formData.get("memberId")),
    String(formData.get("role")) as "owner" | "admin" | "member" | "viewer",
  );
  redirect("/workspaces");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  await removeMember(await userId(), String(formData.get("workspaceId")), String(formData.get("memberId")));
  redirect("/workspaces");
}

export async function createProjectAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createNativeProject(await userId(), String(formData.get("workspaceId")), {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the project" };
  }
  redirect("/projects");
}

export async function updateProjectAction(formData: FormData): Promise<void> {
  await updateProject(await userId(), String(formData.get("workspaceId")), String(formData.get("projectId")), {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  redirect(`/projects/${formData.get("projectId")}`);
}

export async function archiveProjectAction(formData: FormData): Promise<void> {
  await archiveProject(
    await userId(),
    String(formData.get("workspaceId")),
    String(formData.get("projectId")),
    formData.get("archived") === "true",
  );
  redirect("/projects");
}

export async function createMilestoneAction(formData: FormData): Promise<void> {
  await createMilestone(await userId(), String(formData.get("workspaceId")), String(formData.get("projectId")), {
    name: String(formData.get("name") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || null,
  });
  redirect(`/projects/${formData.get("projectId")}`);
}

export async function createTaskAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createTask(await userId(), String(formData.get("workspaceId")), {
      projectId: String(formData.get("projectId")),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      status: (String(formData.get("status") ?? "open") || "open") as "open",
      priority: (String(formData.get("priority") ?? "medium") || "medium") as "medium",
      dueAt: String(formData.get("dueAt") ?? "") || null,
      assigneeUserId: String(formData.get("assigneeUserId") ?? "") || null,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the task" };
  }
  redirect(String(formData.get("returnTo") ?? "/tasks"));
}

export async function updateTaskAction(formData: FormData): Promise<void> {
  await updateTask(await userId(), String(formData.get("workspaceId")), String(formData.get("taskId")), {
    version: Number(formData.get("version")),
    title: formData.has("title") ? String(formData.get("title")) : undefined,
    description: formData.has("description") ? String(formData.get("description")) : undefined,
    status: formData.get("status") ? (String(formData.get("status")) as "open") : undefined,
    priority: formData.get("priority") ? (String(formData.get("priority")) as "medium") : undefined,
    dueAt: formData.has("dueAt") ? String(formData.get("dueAt") ?? "") || null : undefined,
    assigneeUserId: formData.has("assigneeUserId") ? String(formData.get("assigneeUserId") ?? "") || null : undefined,
  });
  const returnTo = String(formData.get("returnTo") ?? "/tasks");
  redirect(returnTo);
}

export async function bulkTaskAction(formData: FormData): Promise<void> {
  const ids = formData.getAll("ids").map(String);
  await bulkUpdateTasks(await userId(), String(formData.get("workspaceId")), {
    ids,
    status: formData.get("status") ? (String(formData.get("status")) as "done") : undefined,
    priority: formData.get("priority") ? (String(formData.get("priority")) as "high") : undefined,
  });
  redirect("/tasks");
}

export async function connectTokenAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await connectWithToken(await userId(), String(formData.get("workspaceId")), {
      provider: String(formData.get("provider")),
      displayName: String(formData.get("displayName") ?? ""),
      accessToken: String(formData.get("accessToken") ?? ""),
      webhookSecret: String(formData.get("webhookSecret") ?? ""),
      cloudId: String(formData.get("cloudId") ?? ""),
      siteUrl: String(formData.get("siteUrl") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not connect" };
  }
  redirect("/integrations");
}

export async function disconnectAction(formData: FormData): Promise<void> {
  await disconnectIntegration(await userId(), String(formData.get("workspaceId")), String(formData.get("integrationId")));
  redirect("/integrations");
}

export async function testConnectionAction(formData: FormData): Promise<void> {
  await testIntegration(await userId(), String(formData.get("workspaceId")), String(formData.get("integrationId")));
  redirect(`/integrations/${formData.get("integrationId")}`);
}

export async function oauthStartAction(formData: FormData): Promise<void> {
  const url = await beginOAuth(
    await userId(),
    String(formData.get("workspaceId")),
    String(formData.get("provider")) as Exclude<ProviderId, "fake">,
  );
  redirect(url);
}

export async function linkProjectAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const id = await createExternalProject(await userId(), String(formData.get("workspaceId")), {
      integrationId: String(formData.get("integrationId")),
      providerProjectId: String(formData.get("providerProjectId")),
      name: String(formData.get("name") ?? ""),
      key: String(formData.get("key") ?? "") || null,
      url: String(formData.get("url") ?? "") || null,
    });
    redirect(`/projects/${id}`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not link the project" };
  }
}

export async function mappingAction(formData: FormData): Promise<void> {
  const mappings = {
    status: {
      open: String(formData.get("status_open") ?? ""),
      in_progress: String(formData.get("status_in_progress") ?? ""),
      blocked: String(formData.get("status_blocked") ?? ""),
      done: String(formData.get("status_done") ?? ""),
      cancelled: String(formData.get("status_cancelled") ?? ""),
    },
    priority: {
      none: String(formData.get("priority_none") ?? ""),
      low: String(formData.get("priority_low") ?? ""),
      medium: String(formData.get("priority_medium") ?? ""),
      high: String(formData.get("priority_high") ?? ""),
      urgent: String(formData.get("priority_urgent") ?? ""),
    },
  };
  await updateFieldMappings(await userId(), String(formData.get("workspaceId")), String(formData.get("projectId")), mappings);
  redirect(`/projects/${formData.get("projectId")}`);
}

export async function publishAction(formData: FormData): Promise<void> {
  await setNativePublishing(
    await userId(),
    String(formData.get("workspaceId")),
    String(formData.get("projectId")),
    formData.get("enabled") === "true",
  );
  redirect(`/projects/${formData.get("projectId")}`);
}

export async function fakeProjectAction(formData: FormData): Promise<void> {
  await addFakeRemoteProject(
    await userId(),
    String(formData.get("workspaceId")),
    String(formData.get("integrationId")),
    String(formData.get("name") ?? "Demo project"),
  );
  redirect(`/integrations/${formData.get("integrationId")}`);
}

export async function retryAction(formData: FormData): Promise<void> {
  await retryDead(await userId(), String(formData.get("workspaceId")), formData.get("kind") === "job" ? "job" : "outbox", String(formData.get("id")));
  redirect("/sync");
}

export async function resolveAction(formData: FormData): Promise<void> {
  const resolution = formData.get("resolution") === "keep_remote" ? "keep_remote" : "keep_local";
  await resolveConflict(await userId(), String(formData.get("workspaceId")), String(formData.get("conflictId")), resolution);
  redirect("/sync");
}

export async function settingsAction(formData: FormData): Promise<void> {
  const user = await userId();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length >= 2) {
    await auth.api.updateUser({ body: { name }, headers: await headers() });
  }
  const theme = String(formData.get("theme") ?? "light");
  (await cookies()).set("atrium_theme", theme === "dark" ? "dark" : "light", { path: "/", sameSite: "lax" });
  await withUser(user, async (tx) => {
    await tx.execute(sql`
      insert into user_preferences (user_id, timezone, theme, notify_sync_errors, notify_assignments)
      values (
        current_setting('app.current_user_id', true),
        ${String(formData.get("timezone") ?? "UTC")},
        ${String(formData.get("theme") ?? "light")},
        ${formData.get("notifySync") === "on"},
        ${formData.get("notifyAssignments") === "on"}
      )
      on conflict (user_id) do update set
        timezone = excluded.timezone,
        theme = excluded.theme,
        notify_sync_errors = excluded.notify_sync_errors,
        notify_assignments = excluded.notify_assignments,
        updated_at = now()
    `);
  });
  redirect("/settings");
}

export async function themeAction(formData: FormData): Promise<void> {
  const user = await userId();
  const theme = String(formData.get("theme") ?? "light") === "dark" ? "dark" : "light";
  (await cookies()).set("atrium_theme", theme, { path: "/", sameSite: "lax" });
  await withUser(user, async (tx) => {
    await tx.execute(sql`
      insert into user_preferences (user_id, timezone, theme, notify_sync_errors, notify_assignments)
      values (
        current_setting('app.current_user_id', true),
        'UTC',
        ${theme},
        true,
        true
      )
      on conflict (user_id) do update set
        theme = excluded.theme,
        updated_at = now()
    `);
  });
}

export async function passwordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = password.safeParse(String(formData.get("newPassword") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password" };
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: parsed.data,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not change the password" };
  }
  return { notice: "Password updated. Other sessions were signed out." };
}
