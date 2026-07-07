import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { encryptToken } from "./crypto";
import { initUserData } from "./driveSync";
import { refreshGoogleAccessToken } from "./googleTokens";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/drive.appdata",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Domain restriction intentionally lives as this one early return, so VIT-only access is a one-line Phase 2 policy change.
      if (!profile?.email) return false;

      const user = await prisma.user.upsert({
        where: { email: profile.email },
        update: {
          name: profile.name,
          image: "picture" in profile && typeof profile.picture === "string" ? profile.picture : undefined,
          ...(account?.refresh_token ? { googleRefreshToken: encryptToken(account.refresh_token) } : {}),
        },
        create: {
          email: profile.email,
          name: profile.name,
          image: "picture" in profile && typeof profile.picture === "string" ? profile.picture : undefined,
          googleRefreshToken: account?.refresh_token ? encryptToken(account.refresh_token) : null,
        },
      });

      if (!user.driveFileId) {
        const accessToken = account?.access_token ?? (account?.refresh_token ? await refreshGoogleAccessToken(account.refresh_token) : null);
        if (!accessToken) return false;

        const { fileId } = await initUserData(user.id, accessToken);
        await prisma.user.update({ where: { id: user.id }, data: { driveFileId: fileId } });
      }

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const user = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        token.sub = user?.id ?? token.sub;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }

      return session;
    },
  },
};
