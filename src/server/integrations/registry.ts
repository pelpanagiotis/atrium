import { fakeAdapter } from "./fake";
import { githubAdapter } from "./github";
import { jiraAdapter } from "./jira";
import { linearAdapter } from "./linear";
import { type IntegrationAdapter, type ProviderId } from "./types";

const ADAPTERS: Record<ProviderId, IntegrationAdapter> = {
  fake: fakeAdapter,
  linear: linearAdapter,
  jira: jiraAdapter,
  github: githubAdapter,
};

export function getAdapter(provider: ProviderId): IntegrationAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unknown provider ${provider}`);
  if (provider === "fake" && process.env.ALLOW_FAKE_PROVIDER !== "true") {
    throw new Error("The fake provider is disabled");
  }
  return adapter;
}

export function listAdapterProviders(): ProviderId[] {
  const providers: ProviderId[] = ["linear", "jira", "github"];
  if (process.env.ALLOW_FAKE_PROVIDER === "true") providers.push("fake");
  return providers;
}

export const OAUTH_SCOPES: Record<Exclude<ProviderId, "fake">, string[]> = {
  linear: ["read", "write"],
  jira: ["read:jira-work", "write:jira-work", "offline_access"],
  github: ["repo"],
};
