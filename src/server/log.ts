const SENSITIVE = /token|secret|password|authorization|credential|cookie/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = SENSITIVE.test(key) ? "[redacted]" : redact(entry);
    }
    return output;
  }
  return value;
}

export function logInfo(message: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", message, ...redact(fields) as object }));
}

export function logError(message: string, fields: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({ level: "error", message, ...redact(fields) as object }));
}
