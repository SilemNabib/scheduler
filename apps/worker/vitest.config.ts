import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    // Applies the migrations to the local Postgres (docker-compose.yml) before the tests.
    globalSetup: ["./test/global-setup.ts"],
    // Tests share one database, so files run one at a time.
    fileParallelism: false,
  },
});
