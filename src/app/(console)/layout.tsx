import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { ensurePersonalWorkspace } from "@/server/workspaces/service";

export const instant = false;

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await ensurePersonalWorkspace(user.id, user.name);
  const { workspaces, current } = await workspaceContext(user.id);
  const cookieStore = await cookies();
  const theme = cookieStore.get("atrium_theme")?.value === "dark" ? "dark" : "light";
  const sidebarCollapsed = cookieStore.get("atrium_sidebar")?.value === "collapsed";
  return (
    <Shell
      user={user}
      workspaces={workspaces}
      current={current}
      theme={theme}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </Shell>
  );
}
