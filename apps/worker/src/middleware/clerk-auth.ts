import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/**
 * Verifies the Clerk session (cookie or Bearer token) and exposes `userId`.
 * Only tokens issued for the app's own origins (`APP_ORIGINS`) are accepted.
 */
export const clerkAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authorizedParties = c.env.APP_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  // An empty list would make Clerk skip the check, so fail closed instead.
  if (authorizedParties.length === 0) throw new Error("Missing APP_ORIGINS");

  const verify = clerkMiddleware({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    authorizedParties,
  });
  await verify(c, async () => {
    c.set("userId", getAuth(c)?.userId ?? null);
    await next();
  });
});
