/**
 * NextAuth v5 catch-all route.
 * All auth endpoints (/api/auth/signin, /api/auth/callback, etc.)
 * are handled by the exported handlers from lib/auth.ts.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
