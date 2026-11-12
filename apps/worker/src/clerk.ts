import { createClerkClient } from "@clerk/backend";

/** Clerk's backend client for this environment's keys. */
export function clerkClient(env: Env) {
  return createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
}
