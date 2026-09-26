import type { Bindings } from "../env";

export function requireEnv(
  env: Bindings,
  key: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "JWT_SECRET",
): string {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key}. Set it via wrangler secret / vars.`);
  return value;
}
