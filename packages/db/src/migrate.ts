import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/agenda";
const client = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(client), {
  migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
});
await client.end();
console.log("Migrations applied");
