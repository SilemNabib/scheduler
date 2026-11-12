import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { clerkAuth } from "../src/middleware/clerk-auth.ts";

// The real Clerk middleware, with made-up keys: malformed tokens are rejected
// without any network call, which is all these tests need.
const app = createApp({ auth: clerkAuth });
const vars = {
  CLERK_SECRET_KEY: "sk_test_not_a_real_key",
  CLERK_PUBLISHABLE_KEY: `pk_test_${btoa("example.clerk.accounts.dev$")}`,
  APP_ORIGINS: "http://localhost",
  ADMIN_USER_IDS: "user_test_admin",
};

async function snapshot(path: string, headers: Record<string, string>) {
  const ctx = createExecutionContext();
  const res = await app.request(path, { headers }, { ...env, ...vars }, ctx);
  await waitOnExecutionContext(ctx);
  return {
    status: res.status,
    headers: [...res.headers].filter(([name]) => name !== "date").sort(),
    body: await res.text(),
  };
}

const requests: [string, Record<string, string>][] = [
  ["without credentials", {}],
  ["with a malformed Bearer token", { Authorization: "Bearer abc.def.ghi" }],
  [
    "with a malformed session cookie from a page load",
    { Cookie: "__session=abc.def.ghi; __client_uat=1", Accept: "text/html", "Sec-Fetch-Dest": "document" },
  ],
];

describe("/api/admin with the real Clerk middleware", () => {
  it.each(requests)("answers exactly like an unknown route %s", async (_, headers) => {
    expect(await snapshot("/api/admin", headers)).toEqual(await snapshot("/api/no-such-route", headers));
  });
});

describe("/api/me with the real Clerk middleware", () => {
  it("rejects a malformed token as unauthenticated", async () => {
    const res = await snapshot("/api/me", { Authorization: "Bearer abc.def.ghi" });
    expect(res.status).toBe(401);
    expect(res.body).toBe(JSON.stringify({ error: "UNAUTHENTICATED" }));
  });
});
