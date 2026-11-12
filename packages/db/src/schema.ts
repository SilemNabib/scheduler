import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A business (tenant). Only the columns the current stories need; plan, status
 * and subscription dates come with the operation stories (OPE-*).
 */
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Who can enter a business's panel. Membership lives in the database, not in
 * Clerk (STACK.md). `userId` is the Clerk user id.
 */
export const businessUsers = pgTable(
  "business_users",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.businessId, t.userId] }),
    // The panel looks up the business from the signed-in user.
    index("business_users_user_id_idx").on(t.userId),
  ],
);
