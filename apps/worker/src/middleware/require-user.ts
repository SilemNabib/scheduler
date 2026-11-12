import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/** Rejects requests without a valid session. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("userId")) {
    return c.json({ error: "UNAUTHENTICATED" }, 401);
  }
  await next();
});
