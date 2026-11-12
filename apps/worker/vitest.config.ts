import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// The tests use their own database on the Docker Postgres (docker-compose.yml),
// never the development one; test/global-setup.ts creates and empties it.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/agenda_test";
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { hyperdrives: { HYPERDRIVE: TEST_DATABASE_URL } },
    }),
  ],
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Tests share one database, so files run one at a time.
    fileParallelism: false,
  },
});
