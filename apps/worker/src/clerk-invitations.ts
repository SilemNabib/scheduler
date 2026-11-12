import { clerkClient } from "./clerk.ts";
import { InvitationError, type InvitationErrorCode, type InviteOwner } from "./invitations.ts";

/** Clerk error codes we can explain to the admin; anything else is a generic failure. */
const KNOWN_ERRORS: Record<string, InvitationErrorCode> = {
  form_identifier_exists: "OWNER_EMAIL_HAS_ACCOUNT",
  duplicate_record: "INVITATION_ALREADY_PENDING",
};

/** Sends the invitation email through Clerk (its template, localized in the Clerk dashboard). */
export const clerkInviteOwner: InviteOwner = async ({ email, redirectUrl }, env) => {
  const clerk = clerkClient(env);
  let accounts: number;
  try {
    // Clerk sends invitations even to emails that already have an account, so check first.
    accounts = await clerk.users.getCount({ emailAddress: [email] });
  } catch {
    throw new InvitationError("INVITATION_FAILED");
  }
  if (accounts > 0) throw new InvitationError("OWNER_EMAIL_HAS_ACCOUNT");

  try {
    await clerk.invitations.createInvitation({ emailAddress: email, redirectUrl, notify: true });
  } catch (error) {
    // Clerk API errors carry `errors: [{ code }]`; @clerk/backend exports no type guard for them.
    const code = (error as { errors?: { code?: string }[] }).errors?.[0]?.code;
    throw new InvitationError((code && KNOWN_ERRORS[code]) || "INVITATION_FAILED");
  }
};
