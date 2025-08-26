import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserWithRolesByEmail, getUserWithRolesById } from "@/lib/repos/user-repo";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;  // 7 days
const SESSION_UPDATE_AGE_SEC = 60 * 60 * 24;   // rotate cookie every 24h on activity
// Refresh window for roles/name/email. If 0 or negative, disable refresh entirely.
const CLAIMS_REFRESH_MS = Math.max(0, Number(process.env.NEXTAUTH_CLAIMS_REFRESH_MS ?? 0));

type TokenLike = {
  uid?: number;
  email?: string;
  name?: string | null;
  roles?: string[];
  tv?: number;   // token_version
  _cl?: number;  // last claims refresh (ms)
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: SESSION_UPDATE_AGE_SEC,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        const u = await getUserWithRolesByEmail(creds.email);
        if (!u) return null;

        const ok = await bcrypt.compare(creds.password, u.password_hash!);
        if (!ok) return null;

        // Seed everything we need up-front (id/email/name/roles/token_version)
        return {
          id: String(u.id),
          email: u.email,
          name: u.name ?? undefined,
          roles: u.roles,
          tv: u.token_version,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as TokenLike;

      // Initial sign-in — user is the object returned by authorize()
      if (user) {
        t.uid = Number((user as any).id);
        t.email = (user as any).email;
        t.name = (user as any).name ?? null;
        t.roles = (user as any).roles ?? [];
        t.tv = (user as any).tv ?? 0;
        t._cl = Date.now();
        return t;
      }

      // Subsequent requests
      if (!t.uid) return token;

      // Only hit DB when claims are considered stale.
      const needsRefresh = !t._cl || Date.now() - t._cl > CLAIMS_REFRESH_MS;
      if (!needsRefresh || CLAIMS_REFRESH_MS <= 0) {
        return t;
      }

      // Check server-forced logout via token_version bump, and refresh claims
      const fresh = await getUserWithRolesById(t.uid);
      if (!fresh || fresh.token_version > (t.tv ?? 0)) {
        // Returning {} clears the session
        return {};
      }

      t.email = fresh.email;
      t.name = fresh.name ?? null;
      t.roles = fresh.roles ?? [];
      t.tv = fresh.token_version ?? 0;
      t._cl = Date.now();

      return t;
    },

    async session({ session, token }) {
      const t = token as TokenLike;
      session.user = {
        ...session.user,
        id: t.uid!,
        email: t.email,
        name: t.name ?? undefined,
        roles: t.roles ?? [],
        token_version: t.tv ?? 0,
      } as any;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  // debug: true,
};
