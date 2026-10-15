import { config } from "dotenv";
import { logError, logInfo } from "../server/log";
import { claimAndRun, scheduleReconcile } from "../server/sync/engine";

config({ path: ".env.local" });
config();

async function tick(): Promise<void> {
  await scheduleReconcile();
  const count = await claimAndRun(`worker-${process.pid}`);
  if (count > 0) logInfo("worker processed jobs", { count });
}

async function main(): Promise<void> {
  await tick();
  setInterval(() => {
    tick().catch((error: unknown) => {
      logError("worker tick failed", { error: error instanceof Error ? error.message : "unknown" });
    });
  }, 2000);
}

void main();
