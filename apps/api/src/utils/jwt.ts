import { sign, verify } from "hono/jwt";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function signSessionToken(userId: string, email: string, secret: string): Promise<string> {
  return sign(
    {
      sub: userId,
      email,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    },
    secret,
  );
}

export async function verifySessionToken(token: string, secret: string): Promise<string | null> {
  const payload = await verify(token, secret, "HS256").catch(() => null);
  return payload && typeof payload.sub === "string" ? payload.sub : null;
}
