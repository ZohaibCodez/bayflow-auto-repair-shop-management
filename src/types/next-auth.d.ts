import type { DefaultSession } from "next-auth";

// Augment Auth.js types so our custom user id is typed everywhere.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
