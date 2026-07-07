import { decryptToken } from "./crypto";
import { prisma } from "./prisma";

export async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to refresh Google access token: ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google token endpoint did not return an access token");
  }

  return payload.access_token;
}

export async function getFreshAccessToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  if (!user?.googleRefreshToken) {
    throw new Error("No Google refresh token is stored for this user");
  }

  return refreshGoogleAccessToken(decryptToken(user.googleRefreshToken));
}
