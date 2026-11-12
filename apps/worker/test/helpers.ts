import { businesses, businessUsers, createDb } from "@agenda/db";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createMiddleware } from "hono/factory";
import { createApp } from "../src/app.ts";
import type { AppEnv } from "../src/types.ts";

/** Test header that stands in for a valid Clerk session. */
export const TEST_USER_HEADER = "x-test-user-id";

const fakeAuth = createMiddleware<AppEnv>(async (c, next) => {
  c.set("userId", c.req.header(TEST_USER_HEADER) ?? null);
  await next();
});

const app = createApp({ auth: fakeAuth });

export async function request(path: string, userId?: string) {
  const headers = userId ? { [TEST_USER_HEADER]: userId } : undefined;
  const ctx = createExecutionContext();
  const res = await app.request(path, { headers }, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

export async function withDb<T>(fn: (db: ReturnType<typeof createDb>) => Promise<T>) {
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    return await fn(db);
  } finally {
    await db.$client.end();
  }
}

/** Creates a business owned by `userId` and returns it. `joinedAt` backdates the membership. */
export function createBusiness(userId: string, joinedAt?: Date) {
  return withDb(async (db) => {
    const slug = `test-${crypto.randomUUID().slice(0, 8)}`;
    const [business] = await db
      .insert(businesses)
      .values({ slug, name: `Negocio ${slug}` })
      .returning({ id: businesses.id, slug: businesses.slug, name: businesses.name });
    await db.insert(businessUsers).values({ businessId: business!.id, userId, createdAt: joinedAt });
    return business!;
  });
}
