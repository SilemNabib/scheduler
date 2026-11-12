import { businesses, businessUsers } from "@agenda/db";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../types.ts";

// Mounted behind `auth` and `requireUser` (app.ts), so `userId` is always set.
export const me = new Hono<AppEnv>().get("/", async (c) => {
  const userId = c.get("userId")!;
  const [business] = await c
    .get("db")
    .select({ id: businesses.id, slug: businesses.slug, name: businesses.name })
    .from(businessUsers)
    .innerJoin(businesses, eq(businesses.id, businessUsers.businessId))
    .where(eq(businessUsers.userId, userId))
    // A user has one business in the MVP; if there were more, pick the oldest membership.
    .orderBy(asc(businessUsers.createdAt), asc(businessUsers.businessId))
    .limit(1);

  // A valid session without a business is not an error: the panel shows "sin acceso".
  return c.json({ business: business ?? null });
});
