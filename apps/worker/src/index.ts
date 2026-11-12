import { createApp } from "./app.ts";
import { clerkInviteOwner } from "./clerk-invitations.ts";
import { clerkAuth } from "./middleware/clerk-auth.ts";

export default createApp({ auth: clerkAuth, inviteOwner: clerkInviteOwner });
