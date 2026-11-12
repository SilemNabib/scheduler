import { describe, expect, it } from "vitest";
import { request } from "./helpers.ts";

const ADMIN = "user_test_admin";
const vars = { ADMIN_USER_IDS: ADMIN };

/** What any unknown API route answers: /api/admin must look exactly like this to non-admins. */
async function unknownRouteResponse(userId?: string) {
  const res = await request("/api/no-such-route", userId, vars);
  return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
}

async function adminResponse(userId?: string, overrides = vars) {
  const res = await request("/api/admin", userId, overrides);
  return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
}

describe("GET /api/admin", () => {
  it("answers like an unknown route without a session", async () => {
    expect(await adminResponse()).toEqual(await unknownRouteResponse());
  });

  it("answers like an unknown route to a signed-in user who is not an admin", async () => {
    const userId = `user_test_${crypto.randomUUID()}`;
    expect(await adminResponse(userId)).toEqual(await unknownRouteResponse(userId));
  });

  it("lets an admin in", async () => {
    const res = await request("/api/admin", ADMIN, vars);
    expect(res.status).toBe(200);
  });

  it("accepts any of several comma-separated admin ids", async () => {
    const res = await request("/api/admin", "user_second", {
      ADMIN_USER_IDS: "user_first, user_second ,user_third",
    });
    expect(res.status).toBe(200);
  });

  it("lets nobody in when no admins are configured", async () => {
    expect((await adminResponse(ADMIN, { ADMIN_USER_IDS: "" })).status).toBe(404);
  });

  it("answers like an unknown route when ADMIN_USER_IDS is not set at all", async () => {
    const missing = { ADMIN_USER_IDS: undefined as unknown as string };
    expect(await adminResponse(ADMIN, missing)).toEqual(await unknownRouteResponse(ADMIN));
  });
});
