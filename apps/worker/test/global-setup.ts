import { execFileSync } from "node:child_process";
import path from "node:path";

// Node scripts run from packages/db, where `postgres` resolves to its Node build
// (here, Vite would pick the Workers build, which needs cloudflare:sockets).
const dbPackage = path.resolve(import.meta.dirname, "../../../packages/db");

/**
 * Creates the test database if needed. It must be named *_test, so the setup
 * can never empty another database by mistake.
 */
const CREATE_TEST_DATABASE = `
  import postgres from "postgres";
  const url = new URL(process.env.TEST_DATABASE_URL);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-z0-9_]+_test$/.test(name)) throw new Error("The test database must be named *_test, got " + name);
  url.pathname = "/postgres";
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const [exists] = await sql\`select 1 from pg_database where datname = \${name}\`;
  if (!exists) await sql.unsafe(\`create database "\${name}"\`);
  await sql.end();
`;

/** Every run starts from an empty test database. */
const EMPTY_TEST_DATABASE = `
  import postgres from "postgres";
  const sql = postgres(process.env.TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  await sql\`truncate businesses, business_users\`;
  await sql.end();
`;

function node(args: string[], env: Record<string, string> = {}) {
  execFileSync(process.execPath, args, { cwd: dbPackage, stdio: "inherit", env: { ...process.env, ...env } });
}

export default function setup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
  node(["--input-type=module", "-e", CREATE_TEST_DATABASE]);
  node(["--experimental-strip-types", "src/migrate.ts"], { DATABASE_URL: testDatabaseUrl });
  node(["--input-type=module", "-e", EMPTY_TEST_DATABASE]);
}
