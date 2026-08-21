import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config.
 * NO Prisma, NO bcryptjs, NO Node-only imports here — this file gets
 * imported by middleware.ts, which runs on the Edge runtime and cannot
 * bundle Node built-ins like `node:util/types` (which Prisma/bcryptjs
 * pull in transitively).
 *
 * The `authorized` callback below lets middleware check "is there a
 * valid session" using just the JWT, without ever touching the DB.
 * The actual Credentials provider (with bcrypt + Prisma) lives in
 * auth.ts, which is only ever loaded in Node runtime routes/pages.
 */
export const authConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [], // real providers are added in auth.ts (Node runtime only)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
