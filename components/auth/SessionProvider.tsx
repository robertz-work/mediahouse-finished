"use client";

/**
 * Wraps `SessionProvider` from next-auth/react so it can be imported inside
 * the root layout (which is a server component). Client components like
 * UserMenu need access to the session via `useSession()`.
 */

import { SessionProvider as NextSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <NextSessionProvider>{children}</NextSessionProvider>;
}
