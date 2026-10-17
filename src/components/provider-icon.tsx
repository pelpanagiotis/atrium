import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  linear: "Linear",
  jira: "Jira",
  github: "GitHub",
  gitlab: "GitLab",
  gitea: "Gitea",
  slack: "Slack",
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

function GiteaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.209 4.603c-.247 0-.525.02-.84.088-.333.07-1.28.283-2.054 1.027C-.403 7.25.035 9.685.089 10.052c.065.446.263 1.687 1.21 2.768 1.749 2.141 5.513 2.092 5.513 2.092s.462 1.103 1.168 2.119c.955 1.263 1.936 2.248 2.89 2.367 2.406 0 7.212-.004 7.212-.004s.458.004 1.08-.394c.535-.324 1.013-.893 1.013-.893s.492-.527 1.18-1.73c.21-.37.385-.729.538-1.068 0 0 2.107-4.471 2.107-8.823-.042-1.318-.367-1.55-.443-1.627-.156-.156-.366-.153-.366-.153s-4.475.252-6.792.306c-.508.011-1.012.023-1.512.027v4.474l-.634-.301c0-1.39-.004-4.17-.004-4.17-1.107.016-3.405-.084-3.405-.084s-5.399-.27-5.987-.324c-.187-.011-.401-.032-.648-.032zm.354 1.832h.111s.271 2.269.6 3.597C5.549 11.147 6.22 13 6.22 13s-.996-.119-1.641-.348c-.99-.324-1.409-.714-1.409-.714s-.73-.511-1.096-1.52C1.444 8.73 2.021 7.7 2.021 7.7s.32-.859 1.47-1.145c.395-.106.863-.12 1.072-.12zm8.33 2.554c.26.003.509.127.509.127l.868.422-.529 1.075a.686.686 0 0 0-.614.359.685.685 0 0 0 .072.756l-.939 1.924a.69.69 0 0 0-.66.527.687.687 0 0 0 .347.763.686.686 0 0 0 .867-.206.688.688 0 0 0-.069-.882l.916-1.874a.667.667 0 0 0 .237-.02.657.657 0 0 0 .271-.137 8.826 8.826 0 0 1 1.016.512.761.761 0 0 1 .286.282c.073.21-.073.569-.073.569-.087.29-.702 1.55-.702 1.55a.692.692 0 0 0-.676.477.681.681 0 1 0 1.157-.252c.073-.141.141-.282.214-.431.19-.397.515-1.16.515-1.16.035-.066.218-.394.103-.814-.095-.435-.48-.638-.48-.638-.467-.301-1.116-.58-1.116-.58s0-.156-.042-.27a.688.688 0 0 0-.148-.241l.516-1.062 2.89 1.401s.48.218.583.619c.073.282-.019.534-.069.657-.24.587-2.1 4.317-2.1 4.317s-.232.554-.748.588a1.065 1.065 0 0 1-.393-.045l-.202-.08-4.31-2.1s-.417-.218-.49-.596c-.083-.31.104-.691.104-.691l2.073-4.272s.183-.37.466-.497a.855.855 0 0 1 .35-.077z"
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

function SlackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.268 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.83 24a2.528 2.528 0 0 1-2.52-2.522v-6.313zM8.83 5.042a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.83 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.83zm0 1.268a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.83a2.528 2.528 0 0 1 2.522-2.52H8.83zm10.128 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.83a2.528 2.528 0 0 1-2.521 2.521h-2.521V8.83zm-1.268 0a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.168 0a2.528 2.528 0 0 1 2.521 2.522v6.311zM15.168 18.958a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.168 24a2.527 2.527 0 0 1-2.52-2.521v-2.521h2.52zm0-1.269a2.527 2.527 0 0 1-2.52-2.52 2.527 2.527 0 0 1 2.52-2.521h6.313A2.527 2.527 0 0 1 24 15.168a2.528 2.528 0 0 1-2.521 2.521H15.168z"
      />
    </svg>
  );
}

const tones: Record<string, string> = {
  linear: "bg-[#5E6AD2]/10 text-[#5E6AD2] ring-1 ring-[#5E6AD2]/25",
  jira: "bg-[#2684FF]/10 text-[#2684FF] ring-1 ring-[#2684FF]/25",
  github: "bg-white text-[#24292f] ring-1 ring-black/15 dark:bg-[#24292f] dark:text-white dark:ring-white/15",
  gitlab: "bg-[#FC6D26]/15 text-[#FC6D26] ring-1 ring-[#FC6D26]/35",
  gitea: "bg-[#609926]/15 text-[#609926] ring-1 ring-[#609926]/35",
  slack: "bg-[#E01E5A]/10 text-[#E01E5A] ring-1 ring-[#E01E5A]/30",
  fake: "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/30",
  native: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/30",
};

/** Solid accents for project tiles / rails — keyed by provider id. */
export const providerAccents: Record<
  string,
  { bar: string; wash: string; ink: string }
> = {
  linear: {
    bar: "bg-[#5E6AD2]",
    wash: "bg-[#5E6AD2]/12 dark:bg-[#5E6AD2]/20",
    ink: "text-[#5E6AD2] dark:text-[#9aa3ef]",
  },
  jira: {
    bar: "bg-[#2684FF]",
    wash: "bg-[#2684FF]/12 dark:bg-[#2684FF]/20",
    ink: "text-[#2684FF] dark:text-[#7eb6ff]",
  },
  github: {
    bar: "bg-[#24292f] dark:bg-[#c9d1d9]",
    wash: "bg-stone-500/10 dark:bg-white/8",
    ink: "text-[#24292f] dark:text-[#c9d1d9]",
  },
  gitlab: {
    bar: "bg-[#FC6D26]",
    wash: "bg-[#FC6D26]/12 dark:bg-[#FC6D26]/18",
    ink: "text-[#E24329] dark:text-[#fc9b66]",
  },
  gitea: {
    bar: "bg-[#609926]",
    wash: "bg-[#609926]/12 dark:bg-[#609926]/18",
    ink: "text-[#609926] dark:text-[#9ccc5a]",
  },
  slack: {
    bar: "bg-[#E01E5A]",
    wash: "bg-[#E01E5A]/10 dark:bg-[#E01E5A]/18",
    ink: "text-[#E01E5A] dark:text-[#f0719a]",
  },
  fake: {
    bar: "bg-amber-600",
    wash: "bg-amber-500/12 dark:bg-amber-500/18",
    ink: "text-amber-800 dark:text-amber-200",
  },
  native: {
    bar: "bg-emerald-600 dark:bg-emerald-400",
    wash: "bg-emerald-500/12 dark:bg-emerald-400/15",
    ink: "text-emerald-800 dark:text-emerald-200",
  },
};

export function providerKey(provider: string | null | undefined): string {
  if (provider && LABELS[provider]) return provider;
  return "native";
}

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
  if (provider === "gitea") return <GiteaMark className={className} />;
  if (provider === "slack") return <SlackMark className={className} />;
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
  const key = providerKey(provider);
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
