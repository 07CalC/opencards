import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export const SESSION_COOKIE = "session";
export const STATE_COOKIE = "oauth_state";

function baseOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true as const, secure, sameSite: "Lax" as const, path: "/", maxAge };
}

export function setStateCookie(c: Context, state: string, secure: boolean): void {
  setCookie(c, STATE_COOKIE, state, baseOptions(secure, 600));
}

export function consumeStateCookie(c: Context): string | undefined {
  const state = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: "/" });
  return state;
}

export function setSessionCookie(c: Context, token: string, secure: boolean, maxAge: number): void {
  setCookie(c, SESSION_COOKIE, token, baseOptions(secure, maxAge));
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE) ?? bearerToken(c);
}

function bearerToken(c: Context): string | undefined {
  const header = c.req.header("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}
