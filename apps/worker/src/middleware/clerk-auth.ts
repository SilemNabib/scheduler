import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { clerkClient } from "../clerk.ts";
import type { AppEnv } from "../types.ts";

/**
 * Sets `userId` from the Clerk session token (Bearer header or cookie), or
 * null without a valid session. Only tokens issued for the app's own origins
 * (`APP_ORIGINS`) are accepted.
 *
 * It never changes the response: no Clerk headers, no redirects, no errors.
 * An invalid token counts as "no session", so every route answers the same
 * way whatever credentials come in (/api/admin must look like an unknown route).
 */
export const clerkAuth = createMiddleware<AppEnv>(async (c, next) => {
  c.set("userId", await sessionUserId(c));
  await next();
});

async function sessionUserId(c: Context<AppEnv>): Promise<string | null> {
  const authorizedParties = c.env.APP_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  // An empty list would make Clerk skip the check, so fail closed instead.
  if (authorizedParties.length === 0) throw new Error("Missing APP_ORIGINS");

  try {
    const state = await clerkClient(c.env).authenticateRequest(c.req.raw, {
      authorizedParties,
      acceptsToken: "session_token",
    });
    return state.isAuthenticated ? state.toAuth().userId : null;
  } catch {
    return null;
  }
}
