export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.EMBEDDED_WORKER === "true") {
    const { startEmbeddedWorker } = await import("@/server/sync/engine");
    startEmbeddedWorker();
  }
}
