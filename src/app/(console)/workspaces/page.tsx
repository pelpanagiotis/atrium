import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { inviteAction, removeMemberAction, roleAction } from "@/app/actions";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import { EditWorkspaceDialog } from "@/components/edit-workspace-dialog";
import { InviteForm } from "@/components/invite-form";
import { WorkspaceContextControl } from "@/components/workspace-context-control";
import { WorkspaceIconBadge } from "@/components/workspace-icon-picker";
import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listInvitations, listMembers } from "@/server/workspaces/service";

export const instant = false;

export default function WorkspacesPage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <WorkspacesContent />
    </Suspense>
  );
}

async function WorkspacesContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { workspaces, current } = await workspaceContext(user.id);
  const members = await listMembers(user.id, current.id);
  const canAdmin = current.role === "owner" || current.role === "admin";
  const invitations = canAdmin ? await listInvitations(user.id, current.id) : [];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Workspaces</h1>
          <p className="mt-1 text-sm text-muted">
            Personal and work contexts are isolated. Change a workspace context anytime from its card or the edit dialog.
          </p>
        </div>
        <CreateWorkspaceForm />
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {workspaces.map((workspace) => {
          const canEdit = workspace.role === "owner" || workspace.role === "admin";
          return (
            <li key={workspace.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <WorkspaceIconBadge icon={workspace.icon} kind={workspace.kind} />
                <div className="min-w-0 flex-1">
                  <WorkspaceContextControl
                    workspaceId={workspace.id}
                    kind={workspace.kind}
                    canEdit={canEdit}
                  />
                  <p className="text-lg font-medium">{workspace.name}</p>
                  <p className="text-sm text-muted">Your role: {workspace.role}</p>
                </div>
                {canEdit ? <EditWorkspaceDialog workspace={workspace} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <section>
        <h2 className="text-2xl">People in {current.name}</h2>
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-muted">{member.email}</p>
              </div>
              {canAdmin ? (
                <div className="flex gap-2">
                  <form action={roleAction} className="flex gap-2">
                    <input type="hidden" name="workspaceId" value={current.id} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <MenuSelect
                      name="role"
                      defaultValue={member.role}
                      aria-label={`Role for ${member.name}`}
                      className="w-auto min-w-36"
                      options={[
                        { value: "owner", label: "Owner" },
                        { value: "admin", label: "Admin" },
                        { value: "member", label: "Member" },
                        { value: "viewer", label: "Viewer" },
                      ]}
                    />
                    <Button type="submit" variant="outline">Save role</Button>
                  </form>
                  <form action={removeMemberAction}>
                    <input type="hidden" name="workspaceId" value={current.id} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <Button type="submit" variant="ghost">Remove</Button>
                  </form>
                </div>
              ) : <span>{member.role}</span>}
            </li>
          ))}
        </ul>
      </section>
      {canAdmin ? <InviteForm workspaceId={current.id} action={inviteAction} /> : null}
      {invitations.length > 0 ? (
        <ul className="text-sm text-muted">
          {invitations.map((invitation) => (
            <li key={String(invitation.id)}>{String(invitation.email)} · {String(invitation.role)} · {invitation.accepted_at ? "accepted" : "pending"}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
