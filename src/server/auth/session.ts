import { headers } from "next/headers";
import { cache } from "react";
import { getAuth } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
});
