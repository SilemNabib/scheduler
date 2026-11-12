import { businesses } from "@agenda/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createBusiness,
  failNextInvitation,
  invitations,
  postJson,
  request,
  withDb,
  resetFakes,
} from "./helpers.ts";

const ADMIN = "user_test_admin";
const vars = { ADMIN_USER_IDS: ADMIN, APP_ORIGINS: "https://app.example" };
const PATH = "/api/admin/businesses";

const newSlug = () => `t-${crypto.randomUUID().slice(0, 8)}`;
// Each owner email can own only one business, so every test uses a new one.
const newEmail = () => `dueno-${crypto.randomUUID().slice(0, 8)}@example.com`;
const valid = () => ({ slug: newSlug(), name: "Óptica de prueba", ownerEmail: newEmail() });

function findBusiness(slug: string) {
  return withDb((db) => db.select().from(businesses).where(eq(businesses.slug, slug)));
}

async function snapshot(res: Response) {
  return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
}

beforeEach(resetFakes);

describe("POST /api/admin/businesses", () => {
  it("answers like an unknown route to anyone who is not an admin", async () => {
    const user = `user_test_${crypto.randomUUID()}`;
    const res = await postJson(PATH, valid(), user, vars);
    const unknown = await postJson("/api/no-such-route", valid(), user, vars);
    expect(await snapshot(res)).toEqual(await snapshot(unknown));
    expect(invitations).toEqual([]);
  });

  it("creates the business with its pending owner and invites the owner to /registro", async () => {
    const id = crypto.randomUUID().slice(0, 8);
    // Typed with capitals: stored and invited in lowercase, as Clerk stores emails.
    const input = { ...valid(), ownerEmail: `  Dueno-${id}@Example.COM ` };
    const res = await postJson(PATH, input, ADMIN, vars);

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ business: { slug: input.slug, name: input.name } });
    const [saved] = await findBusiness(input.slug);
    expect(saved).toMatchObject({ slug: input.slug, name: input.name, ownerEmail: `dueno-${id}@example.com` });
    expect(invitations).toEqual([
      { email: `dueno-${id}@example.com`, redirectUrl: "https://app.example/registro" },
    ]);
  });

  it("rejects an owner email that another business already has, whatever its capitals", async () => {
    const first = valid();
    expect((await postJson(PATH, first, ADMIN, vars)).status).toBe(201);
    invitations.length = 0;

    const second = { ...valid(), ownerEmail: first.ownerEmail.toUpperCase() };
    const res = await postJson(PATH, second, ADMIN, vars);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "VALIDATION", fields: { ownerEmail: "OWNER_EMAIL_IN_USE" } });
    expect(await findBusiness(second.slug)).toEqual([]);
    expect(invitations).toEqual([]);
  });

  it("accepts a name of 80 characters and rejects one of 81", async () => {
    expect((await postJson(PATH, { ...valid(), name: "ñ".repeat(80) }, ADMIN, vars)).status).toBe(201);

    const input = { ...valid(), name: "ñ".repeat(81) };
    const res = await postJson(PATH, input, ADMIN, vars);
    expect(await res.json()).toEqual({ error: "VALIDATION", fields: { name: "NAME_TOO_LONG" } });
    expect(await findBusiness(input.slug)).toEqual([]);
  });

  it("only accepts JSON bodies", async () => {
    const input = valid();
    const res = await request(PATH, ADMIN, vars, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify(input),
    });
    expect(res.status).toBe(415);
    expect(await findBusiness(input.slug)).toEqual([]);
    expect(invitations).toEqual([]);
  });

  it.each([
    ["3 characters", "abc"],
    ["40 characters", "a".repeat(40)],
    ["digits and hyphens", "optica-2-norte"],
  ])("accepts a slug with %s", async (_, slug) => {
    // Fixed slugs: remove any left by an earlier run.
    await withDb((db) => db.delete(businesses).where(eq(businesses.slug, slug)));
    const res = await postJson(PATH, { ...valid(), slug }, ADMIN, vars);
    expect(res.status).toBe(201);
  });

  it.each([
    ["too short (2)", "ab"],
    ["too long (41)", "a".repeat(41)],
    ["uppercase", "Optica"],
    ["a space", "optica norte"],
    ["an accent", "óptica"],
  ])("rejects a slug that is %s", async (_, slug) => {
    const res = await postJson(PATH, { ...valid(), slug }, ADMIN, vars);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "VALIDATION", fields: { slug: "SLUG_INVALID" } });
    expect(await findBusiness(slug)).toEqual([]);
    expect(invitations).toEqual([]);
  });

  it.each(["admin", "precios"])("rejects the reserved slug %s", async (slug) => {
    const res = await postJson(PATH, { ...valid(), slug }, ADMIN, vars);
    expect(await res.json()).toEqual({ error: "VALIDATION", fields: { slug: "SLUG_RESERVED" } });
    expect(invitations).toEqual([]);
  });

  it("rejects a slug another business already uses", async () => {
    const existing = await createBusiness(`user_test_${crypto.randomUUID()}`);
    const res = await postJson(PATH, { ...valid(), slug: existing.slug }, ADMIN, vars);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "VALIDATION", fields: { slug: "SLUG_TAKEN" } });
    expect(invitations).toEqual([]);
  });

  it("rejects an empty name and an invalid email, each in its field", async () => {
    const input = { ...valid(), name: "   ", ownerEmail: "no-es-un-correo" };
    const res = await postJson(PATH, input, ADMIN, vars);
    expect(await res.json()).toEqual({
      error: "VALIDATION",
      fields: { name: "NAME_REQUIRED", ownerEmail: "EMAIL_INVALID" },
    });
    expect(await findBusiness(input.slug)).toEqual([]);
    expect(invitations).toEqual([]);
  });

  it("does not keep the business when the invitation cannot be sent, so the slug can be reused", async () => {
    const input = valid();
    failNextInvitation("OWNER_EMAIL_HAS_ACCOUNT");
    const res = await postJson(PATH, input, ADMIN, vars);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "VALIDATION", fields: { ownerEmail: "OWNER_EMAIL_HAS_ACCOUNT" } });
    expect(await findBusiness(input.slug)).toEqual([]);

    const retry = await postJson(PATH, { ...input, ownerEmail: newEmail() }, ADMIN, vars);
    expect(retry.status).toBe(201);
  });

  it("reports a provider failure without keeping the business", async () => {
    const input = valid();
    failNextInvitation("INVITATION_FAILED");
    const res = await postJson(PATH, input, ADMIN, vars);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "INVITATION_FAILED" });
    expect(await findBusiness(input.slug)).toEqual([]);
  });
});
