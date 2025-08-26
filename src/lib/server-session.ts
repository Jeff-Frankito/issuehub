import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Single session fetch per request. Any caller in the same request context
// gets the same Promise/result without re-running NextAuth.
export const getServerAuthSession = cache(async () => {
  return getServerSession(authOptions);
});

export async function getServerUserId(): Promise<number | null> {
  const session = await getServerAuthSession();
  const id: any = session?.user?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

