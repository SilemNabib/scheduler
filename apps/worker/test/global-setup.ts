import { execFileSync } from "node:child_process";
import path from "node:path";

// Node scripts run from packages/db, where `postgres` resolves to its Node build
// (here, Vite would pick the Workers build, which needs cloudflare:sockets).
const dbPackage = path.resolve(import.meta.dirname, "../../../packages/db");

/**
 * Removes the businesses the tests create (slug "t-…"/"test-…" or an
 * @example.com owner), so they do not pile up in the local database.
 * Only ever touches a local database.
 */
const REMOVE_TEST_BUSINESSES = `
  import postgres from "postgres";
  const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/agenda";
  const { hostname } = new URL(url);
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const sql = postgres(url, { max: 1, onnotice: () => {} });
    await sql\`delete from businesses where slug ~ '^(t-|test-)' or owner_email like '%@example.com'\`;
    await sql.end();
  }
`;

function removeTestBusinesses() {
  execFileSync(process.execPath, ["--input-type=module", "-e", REMOVE_TEST_BUSINESSES], {
    cwd: dbPackage,
    stdio: "inherit",
  });
}

export default function setup() {
  // Applies the migrations before the tests.
  execFileSync(process.execPath, ["--experimental-strip-types", "src/migrate.ts"], {
    cwd: dbPackage,
    stdio: "inherit",
  });
  removeTestBusinesses();
  // Returned function = teardown, after all tests.
  return removeTestBusinesses;
}
