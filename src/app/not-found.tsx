import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="text-4xl">That page is not here</h1>
      <p className="mt-2 text-sm text-muted">The link may be stale, or this record lives in a workspace you cannot open.</p>
      <Link href="/home" className="mt-6 text-sm underline">Back to home</Link>
    </main>
  );
}
