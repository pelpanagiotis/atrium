import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { passwordAction, settingsAction } from "@/app/actions";
import { PasswordForm } from "@/components/password-form";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { getSessionUser } from "@/server/auth/session";
import { withUser } from "@/server/db/client";
import { sql } from "drizzle-orm";

export const instant = false;

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading settings…</p>}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const prefs = await withUser(user.id, (tx) => tx.execute<{
    timezone: string;
    theme: string;
    notify_sync_errors: boolean;
    notify_assignments: boolean;
  }>(sql`select * from user_preferences where user_id = current_setting('app.current_user_id', true)`));
  const pref = prefs[0];
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Settings</h1>
      <form action={settingsAction} className="max-w-xl space-y-3 rounded-lg border bg-card p-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={user.name} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={pref?.timezone ?? "UTC"} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="theme">Theme</Label>
          <Select id="theme" name="theme" defaultValue={pref?.theme ?? "light"} className="mt-1">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="notifySync" defaultChecked={pref?.notify_sync_errors ?? true} />
          Show sync errors on the home page
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="notifyAssignments" defaultChecked={pref?.notify_assignments ?? true} />
          Highlight tasks assigned to me
        </label>
        <Button type="submit">Save settings</Button>
      </form>
      <PasswordForm action={passwordAction} />
      <p className="text-sm text-muted">Signed in as {user.email}</p>
    </div>
  );
}
