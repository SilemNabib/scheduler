import { businesses, businessUsers, createDb } from "@agenda/db";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createMiddleware } from "hono/factory";
import { createApp } from "../src/app.ts";
import { InvitationError, type InvitationErrorCode, type InviteOwner } from "../src/invitations.ts";
import type { AppEnv } from "../src/types.ts";

/** Test header that stands in for a valid Clerk session. */
export const TEST_USER_HEADER = "x-test-user-id";

const fakeAuth = createMiddleware<AppEnv>(async (c, next) => {
  c.set("userId", c.req.header(TEST_USER_HEADER) ?? null);
  await next();
});

/** Invitations the app asked to send, in order. Tests clear it. */
export const invitations: { email: string; redirectUrl: string }[] = [];
let nextInvitationError: InvitationErrorCode | null = null;

/** Makes the next invitation fail with `code`. */
export function failNextInvitation(code: InvitationErrorCode) {
  nextInvitationError = code;
}

const fakeInvite: InviteOwner = async (params) => {
  if (nextInvitationError) {
    const code = nextInvitationError;
    nextInvitationError = null;
    throw new InvitationError(code);
  }
  invitations.push(params);
};

const app = createApp({ auth: fakeAuth, inviteOwner: fakeInvite });

/** Calls the API as `userId` (no session without it). `vars` overrides environment values. */
export async function request(path: string, userId?: string, vars: Partial<Env> = {}, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (userId) headers.set(TEST_USER_HEADER, userId);
  const ctx = createExecutionContext();
  const res = await app.request(path, { ...init, headers }, { ...env, ...vars }, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

/** POSTs `body` as JSON. */
export function postJson(path: string, body: unknown, userId?: string, vars: Partial<Env> = {}) {
  return request(path, userId, vars, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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
