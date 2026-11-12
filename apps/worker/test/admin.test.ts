import { describe, expect, it } from "vitest";
import { postJson, request } from "./helpers.ts";

const ADMIN = "user_test_admin";
const vars = { ADMIN_USER_IDS: ADMIN };

// The admin API is probed with an empty create request: an admin reaches the
// route (and gets a validation error); anyone else must get exactly what an
// unknown route answers.
async function snapshot(res: Response) {
  return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
}

async function unknownRouteResponse(userId?: string) {
  return snapshot(await postJson("/api/no-such-route", {}, userId, vars));
}

async function adminResponse(userId?: string, overrides: Partial<Env> = vars) {
  return snapshot(await postJson("/api/admin/businesses", {}, userId, overrides));
}

describe("/api/admin access", () => {
  it("answers like an unknown route without a session", async () => {
    expect(await adminResponse()).toEqual(await unknownRouteResponse());
  });

  it("answers like an unknown route to a signed-in user who is not an admin", async () => {
    const userId = `user_test_${crypto.randomUUID()}`;
    expect(await adminResponse(userId)).toEqual(await unknownRouteResponse(userId));
  });

  it("lets an admin in", async () => {
    expect((await adminResponse(ADMIN)).status).toBe(400);
  });

  it("accepts any of several comma-separated admin ids", async () => {
    const res = await adminResponse("user_second", { ADMIN_USER_IDS: "user_first, user_second ,user_third" });
    expect(res.status).toBe(400);
  });

  it("lets nobody in when no admins are configured", async () => {
    expect(await adminResponse(ADMIN, { ADMIN_USER_IDS: "" })).toEqual(await unknownRouteResponse(ADMIN));
  });

  it("answers like an unknown route when ADMIN_USER_IDS is not set at all", async () => {
    const missing = { ADMIN_USER_IDS: undefined as unknown as string };
    expect(await adminResponse(ADMIN, missing)).toEqual(await unknownRouteResponse(ADMIN));
  });

  it("no longer has a GET /api/admin endpoint, even for admins", async () => {
    expect((await request("/api/admin", ADMIN, vars)).status).toBe(404);
  });
});
