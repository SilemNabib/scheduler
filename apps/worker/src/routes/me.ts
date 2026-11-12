import { type Db, businesses, businessUsers } from "@agenda/db";
import { and, asc, eq, isNotNull, notExists } from "drizzle-orm";
import { Hono } from "hono";
import type { GetPrimaryEmail } from "../accounts.ts";
import { isAdmin } from "../middleware/require-admin.ts";
import type { AppEnv } from "../types.ts";

/** The user's business: one per user in the MVP; if there were more, the oldest membership. */
async function findBusiness(db: Db, userId: string) {
  const [business] = await db
    .select({ id: businesses.id, slug: businesses.slug, name: businesses.name })
    .from(businessUsers)
    .innerJoin(businesses, eq(businesses.id, businessUsers.businessId))
    .where(eq(businessUsers.userId, userId))
    .orderBy(asc(businessUsers.createdAt), asc(businessUsers.businessId))
    .limit(1);
  return business ?? null;
}

/** Whether some business is still waiting for its invited owner to sign in. */
async function hasPendingOwner(db: Db) {
  const [pending] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(
        isNotNull(businesses.ownerEmail),
        notExists(db.select().from(businessUsers).where(eq(businessUsers.businessId, businesses.id))),
      ),
    )
    .limit(1);
  return Boolean(pending);
}

/**
 * ACC-01: links the user to the business whose pending owner (owner_email) is
 * `email`, if that business has no linked owner yet. The business row is
 * locked while deciding, so two accounts claiming it at once cannot both win.
 */
async function linkPendingOwner(db: Db, userId: string, email: string) {
  await db.transaction(async (tx) => {
    const [business] = await tx
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerEmail, email.toLowerCase()))
      .for("update");
    if (!business) return;
    const [owner] = await tx
      .select({ userId: businessUsers.userId })
      .from(businessUsers)
      .where(eq(businessUsers.businessId, business.id))
      .limit(1);
    if (owner) return;
    await tx.insert(businessUsers).values({ businessId: business.id, userId }).onConflictDoNothing();
  });
}

// Mounted behind `auth`, `requireUser` and `database` (app.ts), so `userId` is always set.
export function meRoutes(getPrimaryEmail: GetPrimaryEmail) {
  return (
    new Hono<AppEnv>()
      // Read-only. A valid session without a business is not an error: the panel
      // shows "sin acceso". `admin` is only present for admins, so other users get
      // no hint that admins exist.
      .get("/", async (c) => {
        const userId = c.get("userId")!;
        const business = await findBusiness(c.get("db"), userId);
        return c.json({ business, ...(isAdmin(c.env, userId) && { admin: true }) });
      })
      // Called by the panel when the user has no business yet (first sign-in after
      // an invitation). Asks Clerk for the email only if some business is pending.
      .post("/claim", async (c) => {
        const userId = c.get("userId")!;
        const db = c.get("db");
        const existing = await findBusiness(db, userId);
        if (existing || !(await hasPendingOwner(db))) return c.json({ business: existing });

        let primary;
        try {
          primary = await getPrimaryEmail(userId, c.env);
        } catch {
          // Not "no business": the panel offers to retry instead of showing "sin acceso".
          return c.json({ error: "ACCOUNT_LOOKUP_FAILED" }, 502);
        }
        if (primary?.verified) await linkPendingOwner(db, userId, primary.email);
        return c.json({ business: await findBusiness(db, userId) });
      })
  );
}
