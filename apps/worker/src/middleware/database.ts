import { createDb } from "@agenda/db";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.ts";

/**
 * One Drizzle client per request over Hyperdrive. It is closed after the
 * response is sent, so closing does not delay the response.
 */
export const database = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  c.set("db", db);
  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(db.$client.end());
  }
});
