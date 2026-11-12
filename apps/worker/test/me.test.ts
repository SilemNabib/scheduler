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

  it("does not return a business that belongs to another user", async () => {
    await createBusiness(newUserId());

    const res = await request("/api/me", newUserId());
    expect(await res.json()).toEqual({ business: null });
  });
});
