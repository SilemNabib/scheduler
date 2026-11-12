import { businesses } from "@agenda/db";
import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { InvitationError, type InviteOwner } from "../invitations.ts";
import type { AppEnv } from "../types.ts";

/**
 * Words that cannot be a business slug: the app's own top-level routes and
 * common pages the SaaS site may need (EPICS.md, OPE-02).
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "panel",
  "login",
  "registro",
  "api",
  "assets",
  "ayuda",
  "soporte",
  "contacto",
  "www",
  "app",
  "precios",
  "terminos",
  "privacidad",
]);

const SLUG_PATTERN = /^[a-z0-9-]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 80;

type FieldErrors = Partial<Record<"slug" | "name" | "ownerEmail", string>>;

function validate(slug: string, name: string, ownerEmail: string): FieldErrors {
  const fields: FieldErrors = {};
  if (!SLUG_PATTERN.test(slug)) fields.slug = "SLUG_INVALID";
  else if (RESERVED_SLUGS.has(slug)) fields.slug = "SLUG_RESERVED";
  if (!name) fields.name = "NAME_REQUIRED";
  // Characters as people count them, not UTF-16 units ("ñ" is one).
  else if ([...name].length > NAME_MAX_LENGTH) fields.name = "NAME_TOO_LONG";
  if (!EMAIL_PATTERN.test(ownerEmail)) fields.ownerEmail = "EMAIL_INVALID";
  return fields;
}

/** The app's address where invitation links land (the first of APP_ORIGINS). */
function registrationUrl(env: Env) {
  const origin = env.APP_ORIGINS.split(",")[0]!.trim();
  return `${origin}/registro`;
}

/** Which field a Postgres unique violation is about, if it is one (a concurrent create). */
function takenField(error: unknown): FieldErrors | null {
  const pg = (error as { cause?: { code?: string; constraint_name?: string } }).cause ?? error;
  const { code, constraint_name } = pg as { code?: string; constraint_name?: string };
  if (code !== "23505") return null;
  return constraint_name === "businesses_owner_email_unique"
    ? { ownerEmail: "OWNER_EMAIL_IN_USE" }
    : { slug: "SLUG_TAKEN" };
}

/** Admin routes. Mounted behind `auth`, `requireAdmin` and `database` (app.ts). */
export function adminRoutes(inviteOwner: InviteOwner) {
  return new Hono<AppEnv>().post("/businesses", async (c) => {
    // JSON only: a cross-site form post cannot send this content type without a preflight.
    if (!c.req.header("content-type")?.startsWith("application/json")) {
      return c.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
    }
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    // Lowercase, as Clerk stores emails: ACC-01 compares it with the verified email.
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";

    const fields = validate(slug, name, ownerEmail);
    if (Object.keys(fields).length > 0) return c.json({ error: "VALIDATION", fields }, 400);

    const db = c.get("db");
    const existing = await db
      .select({ slug: businesses.slug, ownerEmail: businesses.ownerEmail })
      .from(businesses)
      .where(or(eq(businesses.slug, slug), eq(businesses.ownerEmail, ownerEmail)));
    const conflicts: FieldErrors = {};
    if (existing.some((b) => b.slug === slug)) conflicts.slug = "SLUG_TAKEN";
    if (existing.some((b) => b.ownerEmail === ownerEmail)) conflicts.ownerEmail = "OWNER_EMAIL_IN_USE";
    if (Object.keys(conflicts).length > 0) return c.json({ error: "VALIDATION", fields: conflicts }, 400);

    // Save first, then invite: an invitation is never sent for a business that
    // was not saved. If the invitation fails, the business is removed so the
    // same slug and email can be used again.
    let business: { id: string; slug: string; name: string };
    try {
      const [created] = await db
        .insert(businesses)
        .values({ slug, name, ownerEmail })
        .returning({ id: businesses.id, slug: businesses.slug, name: businesses.name });
      business = created!;
    } catch (error) {
      const taken = takenField(error);
      if (taken) return c.json({ error: "VALIDATION", fields: taken }, 400);
      throw error;
    }

    try {
      await inviteOwner({ email: ownerEmail, redirectUrl: registrationUrl(c.env) }, c.env);
    } catch (error) {
      await db.delete(businesses).where(eq(businesses.id, business.id));
      if (!(error instanceof InvitationError)) throw error;
      if (error.code === "INVITATION_FAILED") return c.json({ error: "INVITATION_FAILED" }, 502);
      return c.json({ error: "VALIDATION", fields: { ownerEmail: error.code } }, 400);
    }

    return c.json({ business, ownerEmail }, 201);
  });
}
