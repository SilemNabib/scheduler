// Secrets are not in wrangler.jsonc, so `wrangler types` only sees them when
// .dev.vars exists. Declaring them here keeps the types stable in CI. Both the
// global `Env` (Hono bindings) and `Cloudflare.Env` (`cloudflare:workers`, used
// by the tests) need them.
interface AppSecrets {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  ADMIN_USER_IDS: string;
}

interface Env extends AppSecrets {}

declare namespace Cloudflare {
  interface Env extends AppSecrets {}
}
