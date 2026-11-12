import { businesses, businessUsers } from "@agenda/db";
import { and, eq, isNotNull, like, notExists } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createPendingBusiness,
  failNextPrimaryEmailLookup,
  postJson,
  primaryEmailLookups,
  primaryEmails,
  request,
  withDb,
  resetFakes,
} from "./helpers.ts";

const newUserId = () => `user_test_${crypto.randomUUID()}`;
const newEmail = () => `dueno-${crypto.randomUUID().slice(0, 8)}@example.com`;

async function me(userId: string, vars: Partial<Env> = {}) {
  const res = await request("/api/me", userId, vars);
  return { status: res.status, body: await res.json() };
}

async function claim(userId: string) {
  const res = await postJson("/api/me/claim", {}, userId);
  return { status: res.status, body: await res.json() };
}

function membersOf(businessId: string) {
  return withDb((db) => db.select().from(businessUsers).where(eq(businessUsers.businessId, businessId)));
}

beforeEach(resetFakes);

describe("GET /api/me is read-only", () => {
  it("does not link nor ask Clerk for the email, even for a pending owner", async () => {
    const email = newEmail();
    const business = await createPendingBusiness(email);
    const userId = newUserId();
    primaryEmails.set(userId, { email, verified: true });

    expect(await me(userId)).toEqual({ status: 200, body: { business: null } });
    expect(primaryEmailLookups).toEqual([]);
    expect(await membersOf(business.id)).toEqual([]);
  });

  it("tells an admin they are one without asking Clerk, so a Clerk outage cannot lock them out", async () => {
    failNextPrimaryEmailLookup();
    const res = await me("user_test_admin", { ADMIN_USER_IDS: "user_test_admin" });
    expect(res).toEqual({ status: 200, body: { business: null, admin: true } });
    expect(primaryEmailLookups).toEqual([]);
  });
});

describe("POST /api/me/claim links an invited owner on first sign-in", () => {
  it("links the user whose verified primary email is the pending owner, once", async () => {
    const email = newEmail();
    const business = await createPendingBusiness(email);
    const userId = newUserId();
    primaryEmails.set(userId, { email, verified: true });

    expect(await claim(userId)).toEqual({ status: 200, body: { business } });
    expect(await me(userId)).toEqual({ status: 200, body: { business } });
    // Already linked: claiming again does not ask Clerk.
    expect(await claim(userId)).toEqual({ status: 200, body: { business } });
    expect(primaryEmailLookups).toEqual([userId]);
  });

  it("matches the email whatever its capitals", async () => {
    const email = newEmail();
    const business = await createPendingBusiness(email);
    const userId = newUserId();
    primaryEmails.set(userId, { email: email.toUpperCase(), verified: true });

    expect((await claim(userId)).body).toEqual({ business });
  });

  it("does not link with an unverified primary email", async () => {
    const email = newEmail();
    await createPendingBusiness(email);
    const userId = newUserId();
    primaryEmails.set(userId, { email, verified: false });

    expect((await claim(userId)).body).toEqual({ business: null });
  });

  it("does not link a user whose email is not a pending owner", async () => {
    await createPendingBusiness(newEmail());
    const userId = newUserId();
    primaryEmails.set(userId, { email: newEmail(), verified: true });

    expect((await claim(userId)).body).toEqual({ business: null });
  });

  it("does not link a second account with the same email once the owner is linked", async () => {
    const email = newEmail();
    const business = await createPendingBusiness(email);
    const owner = newUserId();
    const other = newUserId();
    primaryEmails.set(owner, { email, verified: true });
    primaryEmails.set(other, { email, verified: true });

    expect((await claim(owner)).body).toEqual({ business });
    expect((await claim(other)).body).toEqual({ business: null });
  });

  it("links only one of two accounts claiming the same business at the same time", async () => {
    const email = newEmail();
    const business = await createPendingBusiness(email);
    const first = newUserId();
    const second = newUserId();
    primaryEmails.set(first, { email, verified: true });
    primaryEmails.set(second, { email, verified: true });

    await Promise.all([claim(first), claim(second)]);
    expect(await membersOf(business.id)).toHaveLength(1);
  });

  it("does not ask Clerk when no business is waiting for an owner", async () => {
    // Remove the pending businesses other tests left (only test ones: @example.com).
    await withDb((db) =>
      db.delete(businesses).where(
        and(
          isNotNull(businesses.ownerEmail),
          like(businesses.ownerEmail, "%@example.com"),
          notExists(db.select().from(businessUsers).where(eq(businessUsers.businessId, businesses.id))),
        ),
      ),
    );
    const userId = newUserId();
    primaryEmails.set(userId, { email: newEmail(), verified: true });

    expect((await claim(userId)).body).toEqual({ business: null });
    expect(primaryEmailLookups).toEqual([]);
  });

  it("answers an error, not 'no business', when the email lookup fails", async () => {
    const email = newEmail();
    await createPendingBusiness(email);
    const userId = newUserId();
    primaryEmails.set(userId, { email, verified: true });
    failNextPrimaryEmailLookup();

    expect(await claim(userId)).toEqual({ status: 502, body: { error: "ACCOUNT_LOOKUP_FAILED" } });
  });
});
