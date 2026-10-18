import { oauthConfigured } from "./service";
import { listAdapterProviders } from "./registry";
import { CHAT_PROVIDERS, NOTE_PROVIDERS, type ProviderId } from "./types";

// The providers a user can connect, and whether each one has OAuth configured
// on this server. Slack and Obsidian always use a pasted token or path.
export function providerCatalog(): { providers: string[]; oauth: Record<string, boolean> } {
  const providers = [
    ...listAdapterProviders().filter((provider) => provider !== "fake"),
    ...CHAT_PROVIDERS,
    ...NOTE_PROVIDERS,
  ];
  const oauth = Object.fromEntries(
    providers.map((provider) => {
      if (provider === "slack" || provider === "obsidian") return [provider, false] as const;
      return [provider, oauthConfigured(provider as Exclude<ProviderId, "fake">)] as const;
    }),
  );
  return { providers, oauth };
}
