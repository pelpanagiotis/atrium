import { config } from "dotenv";
import { execSync } from "node:child_process";

export default function setup(): void {
  config({ path: ".env.test", override: true });
  execSync("pnpm exec tsx scripts/migrate.ts", { stdio: "inherit", env: process.env });
}
