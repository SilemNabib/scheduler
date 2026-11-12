import { execFileSync } from "node:child_process";
import path from "node:path";

export default function setup() {
  execFileSync(process.execPath, ["--experimental-strip-types", "src/migrate.ts"], {
    cwd: path.resolve(import.meta.dirname, "../../../packages/db"),
    stdio: "inherit",
  });
}
