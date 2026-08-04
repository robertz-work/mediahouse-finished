/**
 * NextAuth v5 — FULL configuration with Credentials provider.
 *
 * This file imports Node.js modules (bcryptjs, usersRepo → fs, proper-lockfile)
 * and therefore CANNOT run in Edge runtime. It is used by:
 *   - `app/api/auth/[...nextauth]/route.ts`  (Node.js runtime)
 *   - Server components via `auth()` session reading
 *   - Server actions via `signIn()` / `signOut()`
 *
 * The middleware uses `lib/auth.config.ts` directly (Edge-safe).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findByEmail, verifyPassword } from "./db/usersRepo";
import authConfig from "./auth.config";
import { rateLimit } from "./rateLimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const limit = rateLimit(
          `login:${email.toLowerCase()}`,
          10,
          10 * 60 * 1000
        );
        if (!limit.ok) return null;

        const user = await findByEmail(email);
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
