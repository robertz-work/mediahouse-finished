/**
 * Shared helper for admin-only API routes.
 * Returns the session if user is admin, or null (and the caller should
 * return a 403 response).
 */

import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}
