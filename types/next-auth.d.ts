/* eslint-disable @typescript-eslint/no-unused-vars */
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      name: string;
      email: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
  }
}
