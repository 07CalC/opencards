import { createMiddleware } from "hono/factory";
import type { Bindings } from "../env";
import { UserService, type PublicUser } from "../services/users";
import { getSessionToken } from "../utils/cookies";
import { requireEnv } from "../utils/env";
import { verifySessionToken } from "../utils/jwt";

export type AuthVariables = {
  user: PublicUser;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: AuthVariables;
};

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const userId = await verifySessionToken(token, requireEnv(c.env, "JWT_SECRET"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const user = await new UserService(c.env.DB).findById(userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  c.set("user", UserService.toPublicUser(user));
  await next();
});
