/**
 * NextAuth config — EDGE-COMPATIBLE portion.
 *
 * This file is imported by BOTH:
 *   - `lib/auth.ts`      → full config with Credentials provider (Node.js)
 *   - `middleware.ts`     → lightweight JWT reading (Edge runtime)
 *
 * It must NOT import anything that uses Node.js APIs (fs, proper-lockfile,
 * bcryptjs, etc.). Only callbacks, pages config, and session strategy.
 */

import type { NextAuthConfig } from "next-auth";

const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as unknown as { role: "client" | "representative" | "admin" }).role;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "client" | "representative" | "admin";
      }
      return session;
    },
  },

  providers: [],
};

export default authConfig;
