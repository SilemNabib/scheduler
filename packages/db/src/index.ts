import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export * from "./schema.ts";
export { schema };

export type Db = ReturnType<typeof createDb>;

/**
 * Creates a Drizzle client over postgres.js. In the Worker, `connectionString`
 * comes from the Hyperdrive binding, which already pools connections.
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 5,
    // Hyperdrive does not support prepared statements across connections.
    prepare: false,
    fetch_types: false,
  });
  return drizzle(client, { schema });
}
