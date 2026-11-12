import { businesses, businessUsers, createDb } from "@agenda/db";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createMiddleware } from "hono/factory";
import type { GetPrimaryEmail, PrimaryEmail } from "../src/accounts.ts";
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

/** Primary emails the fake account lookup returns, by user id. Tests fill and clear it. */
export const primaryEmails = new Map<string, PrimaryEmail>();
/** User ids the app looked up, in order. */
export const primaryEmailLookups: string[] = [];
let failPrimaryEmailLookup = false;

/** Makes the next primary email lookup fail. */
export function failNextPrimaryEmailLookup() {
  failPrimaryEmailLookup = true;
}

const fakeGetPrimaryEmail: GetPrimaryEmail = async (userId) => {
  primaryEmailLookups.push(userId);
  if (failPrimaryEmailLookup) {
    failPrimaryEmailLookup = false;
    throw new Error("Lookup failed");
  }
  return primaryEmails.get(userId) ?? null;
};

/** Resets every fake (recorded calls and pending failures) between tests. */
export function resetFakes() {
  invitations.length = 0;
  nextInvitationError = null;
  primaryEmails.clear();
  primaryEmailLookups.length = 0;
  failPrimaryEmailLookup = false;
}

const app = createApp({ auth: fakeAuth, inviteOwner: fakeInvite, getPrimaryEmail: fakeGetPrimaryEmail });

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

/** Creates a business whose owner was invited with `ownerEmail` and has not signed in yet. */
export function createPendingBusiness(ownerEmail: string) {
  return withDb(async (db) => {
    const slug = `test-${crypto.randomUUID().slice(0, 8)}`;
    const [business] = await db
      .insert(businesses)
      .values({ slug, name: `Negocio ${slug}`, ownerEmail })
      .returning({ id: businesses.id, slug: businesses.slug, name: businesses.name });
    return business!;
  });
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
