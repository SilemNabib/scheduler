/** Why an owner invitation could not be sent. */
export type InvitationErrorCode =
  /** There is already an account with that email. */
  | "OWNER_EMAIL_HAS_ACCOUNT"
  /** That email already has a pending invitation. */
  | "INVITATION_ALREADY_PENDING"
  /** Any other failure (network, provider). */
  | "INVITATION_FAILED";

export class InvitationError extends Error {
  constructor(readonly code: InvitationErrorCode) {
    super(code);
  }
}

/**
 * Sends the owner an invitation whose link opens `redirectUrl`. Clerk in
 * production; the tests inject a fake one. Throws InvitationError.
 */
export type InviteOwner = (params: { email: string; redirectUrl: string }, env: Env) => Promise<void>;
