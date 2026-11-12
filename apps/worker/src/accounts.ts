/** A user's primary email address and whether it is verified. */
export type PrimaryEmail = { email: string; verified: boolean };

/**
 * Looks up a user's primary email (null if the user has none). Clerk in
 * production; the tests inject a fake one. Throws if the lookup fails.
 */
export type GetPrimaryEmail = (userId: string, env: Env) => Promise<PrimaryEmail | null>;
