import { describe, expect, it } from "vitest";
import { createBusiness, request } from "./helpers.ts";

const newUserId = () => `user_test_${crypto.randomUUID()}`;

describe("GET /api/me", () => {
  it("rejects requests without a session", async () => {
    const res = await request("/api/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHENTICATED" });
  });

  it("returns no business for a signed-in user without one", async () => {
    const res = await request("/api/me", newUserId());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ business: null });
  });

  it("returns the business of the signed-in user", async () => {
    const userId = newUserId();
    const business = await createBusiness(userId);

    const res = await request("/api/me", userId);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ business });
  });

  it("always returns the business the user joined first", async () => {
    const userId = newUserId();
    // Inserted second, but joined earlier: the order must come from the join date.
    await createBusiness(userId);
    const first = await createBusiness(userId, new Date("2020-01-01T00:00:00Z"));

    const res = await request("/api/me", userId);
    expect(await res.json()).toEqual({ business: first });
  });

  it("tells an admin that they are one", async () => {
    const res = await request("/api/me", "user_test_admin", { ADMIN_USER_IDS: "user_test_admin" });
    expect(await res.json()).toEqual({ business: null, admin: true });
  });

  it("does not mention admins to anyone else", async () => {
    const res = await request("/api/me", newUserId(), { ADMIN_USER_IDS: "user_test_admin" });
    expect(await res.json()).toEqual({ business: null });
  });

  it("does not return a business that belongs to another user", async () => {
    await createBusiness(newUserId());

    const res = await request("/api/me", newUserId());
    expect(await res.json()).toEqual({ business: null });
  });

  // ACC-04: the business comes from the session, never from what the browser sends.
  it("ignores a business id or slug sent by the browser", async () => {
    const userId = newUserId();
    const own = await createBusiness(userId);
    const other = await createBusiness(newUserId());

    const query = `businessId=${other.id}&slug=${other.slug}`;
    const res = await request(`/api/me?${query}`, userId, {}, {
      headers: { "x-business-id": other.id },
    });
    expect(await res.json()).toEqual({ business: own });
  });
});
