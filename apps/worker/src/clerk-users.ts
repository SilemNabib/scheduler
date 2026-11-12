import type { GetPrimaryEmail } from "./accounts.ts";
import { clerkClient } from "./clerk.ts";

/** The user's primary email from Clerk (the session token does not carry it). */
export const clerkGetPrimaryEmail: GetPrimaryEmail = async (userId, env) => {
  const user = await clerkClient(env).users.getUser(userId);
  const primary = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  if (!primary) return null;
  return { email: primary.emailAddress, verified: primary.verification?.status === "verified" };
};
