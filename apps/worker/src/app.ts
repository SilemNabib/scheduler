import { Hono, type MiddlewareHandler } from "hono";
import { database } from "./middleware/database.ts";
import { requireUser } from "./middleware/require-user.ts";
import { me } from "./routes/me.ts";
import type { AppEnv } from "./types.ts";

type Deps = {
  /** Sets `userId`. Clerk in production; the tests inject a fake one. */
  auth: MiddlewareHandler<AppEnv>;
};

export function createApp({ auth }: Deps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.get("/health", (c) => c.json({ ok: true }));

  // The session is checked before opening the database.
  app.use("/me/*", auth, requireUser, database);
  app.route("/me", me);

  app.notFound((c) => c.json({ error: "NOT_FOUND" }, 404));

  return app;
}
