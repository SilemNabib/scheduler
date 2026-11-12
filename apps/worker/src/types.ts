import type { Db } from "@agenda/db";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    /** Clerk user id of the signed-in user, or null without a valid session. */
    userId: string | null;
    db: Db;
  };
};
