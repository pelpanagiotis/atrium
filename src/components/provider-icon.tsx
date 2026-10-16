import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  linear: "Linear",
  jira: "Jira",
  github: "GitHub",
  gitlab: "GitLab",
  fake: "Fake provider",
  native: "Native",
};

function LinearMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"
      />
    </svg>
  );
}

function JiraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"
      />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
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

function GitLabMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.919 1.263a.455.455 0 0 0-.867 0L1.388 9.452.045 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.624-8.443a.92.92 0 0 0 .331-1.024"
      />
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
  github: "bg-white text-[#24292f] ring-1 ring-black/15",
  gitlab: "bg-[#FC6D26]/15 text-[#FC6D26] ring-1 ring-[#FC6D26]/35",
  fake: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  native: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
};

export function providerLabel(provider: string | null | undefined): string {
  if (provider && LABELS[provider]) return LABELS[provider];
  return LABELS.native ?? "Native";
}

function ProviderMark({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  if (provider === "linear") return <LinearMark className={className} />;
  if (provider === "jira") return <JiraMark className={className} />;
  if (provider === "github") return <GitHubMark className={className} />;
  if (provider === "gitlab") return <GitLabMark className={className} />;
  if (provider === "fake") return <FakeMark className={className} />;
  return <NativeMark className={className} />;
}

export function ProviderIcon({
  provider,
  className,
  size = "sm",
}: {
  provider: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const key = provider && LABELS[provider] ? provider : "native";
  const label = LABELS[key] ?? "Native";
  const shell = size === "lg" ? "size-12" : size === "md" ? "size-9" : "size-6";
  const iconClass = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-3.5";
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        shell,
        tones[key] ?? tones.native,
        className,
      )}
    >
      <ProviderMark provider={key} className={iconClass} />
    </span>
  );
}

export function OpenInProviderButton({
  provider,
  href,
  className,
}: {
  provider: string | null | undefined;
  href: string;
  className?: string;
}) {
  const key = provider && LABELS[provider] ? provider : null;
  if (!key || key === "native") return null;
  const label = LABELS[key] ?? "provider";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-foreground transition hover:bg-accent",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full",
          tones[key] ?? tones.native,
        )}
      >
        <ProviderMark provider={key} className="size-3" />
      </span>
      Open in {label}
      <ExternalLink className="size-3 text-muted" aria-hidden="true" />
    </a>
  );
}
