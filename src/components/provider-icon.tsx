import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  linear: "Linear",
  jira: "Jira",
  github: "GitHub",
  fake: "Fake provider",
  native: "Native",
};

function LinearMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.82 13.12a9.38 9.38 0 0 0 8.06 8.06l-8.06-8.06Zm1.56-3.4L14.28 19.62A9.4 9.4 0 0 0 19.62 14.28L4.38 9.72Zm3.08-4.4 10.62 10.62a9.37 9.37 0 0 0 1.54-4.78L12.9 5.32a9.4 9.4 0 0 0-4.44.6ZM12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25Z"
      />
    </svg>
  );
}

function JiraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.01 2.01 6.52 7.5a6.12 6.12 0 0 0 0 8.66l5.49 5.49 5.49-5.49a6.12 6.12 0 0 0 0-8.66L12.01 2.01Zm0 13.2-3.84-3.84a2.72 2.72 0 0 1 0-3.85L12 3.68l3.84 3.84a2.72 2.72 0 0 1 0 3.85l-3.83 3.84Z"
      />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 7.07c.85 0 1.71.12 2.51.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

function NativeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" strokeLinejoin="round" />
      <path d="M12 12v9M12 12 4 7.5M12 12l8-4.5" strokeLinecap="round" />
    </svg>
  );
}

function FakeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M9 10h.01M15 10h.01M9.5 15c.8.8 1.7 1.2 2.5 1.2s1.7-.4 2.5-1.2" strokeLinecap="round" />
    </svg>
  );
}

const tones: Record<string, string> = {
  linear: "bg-[#5E6AD2]/10 text-[#5E6AD2] ring-1 ring-[#5E6AD2]/25",
  jira: "bg-[#2684FF]/10 text-[#2684FF] ring-1 ring-[#2684FF]/25",
  github: "bg-stone-900/5 text-stone-900 ring-1 ring-stone-900/15",
  fake: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  native: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
};

export function ProviderIcon({
  provider,
  className,
}: {
  provider: string | null | undefined;
  className?: string;
}) {
  const key = provider && LABELS[provider] ? provider : "native";
  const label = LABELS[key] ?? "Native";
  const iconClass = "size-3.5";
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full",
        tones[key] ?? tones.native,
        className,
      )}
    >
      {key === "linear" ? <LinearMark className={iconClass} /> : null}
      {key === "jira" ? <JiraMark className={iconClass} /> : null}
      {key === "github" ? <GitHubMark className={iconClass} /> : null}
      {key === "fake" ? <FakeMark className={iconClass} /> : null}
      {key === "native" ? <NativeMark className={iconClass} /> : null}
    </span>
  );
}
