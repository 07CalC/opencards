import { Hono } from "hono";
import type { Bindings } from "../env";
import { GoogleEmailNotVerifiedError, GoogleService } from "../services/google";
import { UserService, type NewGoogleUser } from "../services/users";
import { clearSessionCookie, consumeStateCookie, getSessionToken, setSessionCookie, setStateCookie } from "../utils/cookies";
import { SESSION_MAX_AGE, signSessionToken, verifySessionToken } from "../utils/jwt";
import { isSecureRequest, randomState } from "../utils/oauth";

export const auth = new Hono<{ Bindings: Bindings }>();

auth.get("/google", (c) => {
  const google = new GoogleService({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri: GoogleService.resolveRedirectUri(c.env.GOOGLE_REDIRECT_URI, c.req.url),
  });
  const state = randomState();
  setStateCookie(c, state, isSecureRequest(c.req.url));
  return c.redirect(google.buildAuthUrl(state), 302);
});

auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const expectedState = consumeStateCookie(c);

  if (!code) return c.json({ error: "Missing code" }, 400);
  if (!state || !expectedState || state !== expectedState) {
    return c.json({ error: "Invalid state" }, 401);
  }

  let profile: NewGoogleUser;
  try {
    const google = new GoogleService({
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri: GoogleService.resolveRedirectUri(c.env.GOOGLE_REDIRECT_URI, c.req.url),
    });
    const accessToken = await google.exchangeCode(code);
    const info = await google.fetchUserInfo(accessToken);
    profile = {
      name: GoogleService.displayNameFor(info),
      email: info.email,
      avatar: info.picture ?? null,
      googleSub: info.sub,
    };
  } catch (err) {
    if (err instanceof GoogleEmailNotVerifiedError) return c.json({ error: err.message }, 401);
    return c.json({ error: err instanceof Error ? err.message : "Google login failed" }, 502);
  }

  const users = new UserService(c.env.DB);
  let user;
  try {
    const existing = await users.findByGoogleProfile(profile.googleSub, profile.email);
    if (existing) {
      await users.linkToGoogle(existing.id, profile);
      user = { ...existing, name: profile.name, avatar: profile.avatar, provider: "google", google_sub: profile.googleSub };
    } else {
      user = await users.createGoogleUser(profile);
    }
  } catch {
    return c.json({ error: "Failed to save user" }, 500);
  }

  const token = await signSessionToken(user.id, user.email, c.env.JWT_SECRET);
  setSessionCookie(c, token, isSecureRequest(c.req.url), SESSION_MAX_AGE);

  if (c.env.FRONTEND_URL) return c.redirect(c.env.FRONTEND_URL, 302);
  return c.json({ user: UserService.toPublicUser(user) });
});

auth.get("/me", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const userId = await verifySessionToken(token, c.env.JWT_SECRET);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const user = await new UserService(c.env.DB).findById(userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  return c.json({ user: UserService.toPublicUser(user) });
});

auth.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});
