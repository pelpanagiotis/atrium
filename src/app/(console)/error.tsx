"use client";

export default function ConsoleError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-2xl">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "The server rejected the request."}</p>
      <button className="mt-4 rounded-md border px-3 py-2 text-sm" onClick={() => reset()}>Try again</button>
    </div>
  );
}
