import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/** Whether `userId` is listed in ADMIN_USER_IDS (comma-separated Clerk user ids). */
export function isAdmin(env: Env, userId: string | null): boolean {
  if (!userId) return false;
  // A missing variable must not become a 500 that reveals the route: nobody is admin.
  const admins = (env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return admins.includes(userId);
}

/**
 * Lets in only admins. Anyone else gets the app's regular not-found response,
 * so /api/admin looks like a route that does not exist.
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!isAdmin(c.env, c.get("userId"))) return c.notFound();
  await next();
});
