import { Hono, type MiddlewareHandler } from "hono";
import type { GetPrimaryEmail } from "./accounts.ts";
import type { InviteOwner } from "./invitations.ts";
import { database } from "./middleware/database.ts";
import { requireAdmin } from "./middleware/require-admin.ts";
import { requireUser } from "./middleware/require-user.ts";
import { adminRoutes } from "./routes/admin.ts";
import { meRoutes } from "./routes/me.ts";
import type { AppEnv } from "./types.ts";

type Deps = {
  /** Sets `userId`. Clerk in production; the tests inject a fake one. */
  auth: MiddlewareHandler<AppEnv>;
  /** Sends owner invitations. Clerk in production; the tests inject a fake one. */
  inviteOwner: InviteOwner;
  /** Looks up a user's primary email. Clerk in production; the tests inject a fake one. */
  getPrimaryEmail: GetPrimaryEmail;
};

export function createApp({ auth, inviteOwner, getPrimaryEmail }: Deps) {
  const app = new Hono<AppEnv>().basePath("/api");

  // Every request, unknown routes included, goes through the same session
  // check, so /api/admin cannot be told apart from a route that does not exist.
  app.use("*", auth);

  app.get("/health", (c) => c.json({ ok: true }));

  // The session is checked before opening the database.
  app.use("/me/*", requireUser, database);
  app.route("/me", meRoutes(getPrimaryEmail));

  // Only admins: for anyone else these routes answer like routes that do not exist.
  app.use("/admin/*", requireAdmin, database);
  app.route("/admin", adminRoutes(inviteOwner));

  app.notFound((c) => c.json({ error: "NOT_FOUND" }, 404));

  return app;
}
