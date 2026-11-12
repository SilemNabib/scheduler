import { createApp } from "./app.ts";
import { clerkAuth } from "./middleware/clerk-auth.ts";

export default createApp({ auth: clerkAuth });
