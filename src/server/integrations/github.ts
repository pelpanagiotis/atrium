import { verifyHmacSha256 } from "../crypto/secrets";
import { nextLink, providerFetch } from "./http";
import { mapPriorityToProvider, mapStatusFromProvider } from "./mappings";
import {
  operationMarker,
  ProviderError,
  type FieldMappings,
  type IntegrationAdapter,
  type RemoteTask,
  type TaskPriority,
} from "./types";

type GhIssue = {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  state: "open" | "closed";
  html_url: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  assignee?: { login: string } | null;
  pull_request?: unknown;
};

const CAPABILITIES = {
  createTask: true,
  updateTask: true,
  archiveTask: true,
  webhooks: true,
  fields: { title: true, description: true, status: true, priority: true, assignee: false, dueDate: false },
};

function defaultMappings(): FieldMappings {
  return {
    status: { open: "open", in_progress: "open", blocked: "open", done: "closed", cancelled: "closed" },
    priority: {
      none: "priority:none",
      low: "priority:low",
      medium: "priority:medium",
      high: "priority:high",
      urgent: "priority:urgent",
    },
    assignees: {},
  };
}

function priorityFromLabels(labels: Array<{ name: string }>, mappings: FieldMappings): TaskPriority {
  const names = labels.map((label) => label.name);
  for (const [priority, label] of Object.entries(mappings.priority ?? {})) {
    if (label && names.includes(label)) return priority as TaskPriority;
  }
  return "none";
}

function toRemote(issue: GhIssue, projectId: string, mappings: FieldMappings): RemoteTask {
  const closed = issue.state === "closed";
  return {
    providerId: String(issue.number),
    providerProjectId: projectId,
    title: issue.title,
    description: issue.body ?? "",
    status: closed ? mapStatusFromProvider(mappings, "closed") : "open",
    priority: priorityFromLabels(issue.labels ?? [], mappings),
    dueAt: null,
    assigneeProviderId: issue.assignee?.login ?? null,
    assigneeLabel: issue.assignee?.login ?? null,
    url: issue.html_url,
    updatedAt: issue.updated_at,
    archived: closed,
    raw: { nodeId: issue.id, labels: (issue.labels ?? []).map((label) => label.name) },
  };
}

async function gh<T>(url: string, token: string, init: RequestInit = {}): Promise<{ data: T; response: Response }> {
  const response = await providerFetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = (await response.json()) as T;
  return { data, response };
}

function repo(projectId: string): string {
  if (!/^[^/\s]+\/[^/\s]+$/.test(projectId)) {
    throw new ProviderError("GitHub repository must look like owner/name", "validation", false);
  }
  return projectId;
}

export const githubAdapter: IntegrationAdapter = {
  provider: "github",
  defaultMappings,
  getCapabilities: () => CAPABILITIES,
  async validateConnection(ctx) {
    const { data } = await gh<{ id: number; login: string }>("https://api.github.com/user", ctx.credentials.accessToken);
    return { accountLabel: data.login, externalAccountId: String(data.id) };
  },
  async listProjects(ctx, cursor) {
    const page = cursor ?? "1";
    const { data, response } = await gh<Array<{ full_name: string; name: string; html_url: string }>>(
      `https://api.github.com/user/repos?per_page=50&page=${encodeURIComponent(page)}&sort=updated`,
      ctx.credentials.accessToken,
    );
    const link = nextLink(response.headers.get("link"));
    const next = link ? new URL(link).searchParams.get("page") : null;
    return {
      items: data.map((item) => ({ providerId: item.full_name, key: item.name, name: item.full_name, url: item.html_url })),
      nextCursor: next,
    };
  },
  async listTasks(ctx, query) {
    const page = query.cursor ?? "1";
    const { data, response } = await gh<GhIssue[]>(
      `https://api.github.com/repos/${repo(query.providerProjectId)}/issues?state=all&per_page=50&page=${encodeURIComponent(page)}`,
      ctx.credentials.accessToken,
    );
    const link = nextLink(response.headers.get("link"));
    return {
      items: data.filter((issue) => !issue.pull_request).map((issue) => toRemote(issue, query.providerProjectId, ctx.mappings)),
      nextCursor: link ? new URL(link).searchParams.get("page") : null,
    };
  },
  async getTask(ctx, providerId, providerProjectId) {
    const { data } = await gh<GhIssue>(
      `https://api.github.com/repos/${repo(providerProjectId)}/issues/${encodeURIComponent(providerId)}`,
      ctx.credentials.accessToken,
    );
    return toRemote(data, providerProjectId, ctx.mappings);
  },
  async createTask(ctx, input) {
    const marker = operationMarker(input.operationId);
    const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(`${marker} repo:${input.providerProjectId} in:body`)}`;
    const { data: search } = await gh<{ items: GhIssue[] }>(searchUrl, ctx.credentials.accessToken);
    const replay = search.items?.[0];
    if (replay) return toRemote(replay, input.providerProjectId, ctx.mappings);
    const labels = [mapPriorityToProvider(ctx.mappings, input.priority ?? "none")];
    const { data } = await gh<GhIssue>(`https://api.github.com/repos/${repo(input.providerProjectId)}/issues`, ctx.credentials.accessToken, {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        body: `${input.description ?? ""}\n\n${marker}`.trim(),
        labels,
      }),
    });
    return toRemote(data, input.providerProjectId, ctx.mappings);
  },
  async updateTask(ctx, providerId, input) {
    const current = await this.getTask(ctx, providerId, input.providerProjectId);
    const labels = new Set(((current.raw.labels as string[] | undefined) ?? []).filter((label) => !label.startsWith("priority:")));
    if (input.priority) labels.add(mapPriorityToProvider(ctx.mappings, input.priority));
    const body: Record<string, unknown> = { labels: [...labels] };
    if (input.title) body.title = input.title;
    if (input.description !== undefined) body.body = input.description;
    if (input.status) body.state = input.status === "done" || input.status === "cancelled" ? "closed" : "open";
    const { data } = await gh<GhIssue>(
      `https://api.github.com/repos/${repo(input.providerProjectId)}/issues/${encodeURIComponent(providerId)}`,
      ctx.credentials.accessToken,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return toRemote(data, input.providerProjectId, ctx.mappings);
  },
  async archiveTask(ctx, providerId, providerProjectId) {
    return this.updateTask(ctx, providerId, { providerProjectId, operationId: providerId, status: "done" });
  },
  async verifyWebhook(ctx, request) {
    const secret = ctx.credentials.webhookSecret;
    if (!secret) return false;
    const signature = request.headers["x-hub-signature-256"] ?? "";
    return verifyHmacSha256(secret, request.rawBody, signature);
  },
  async parseWebhook(ctx, request) {
    const event = request.headers["x-github-event"] ?? "";
    const body = JSON.parse(request.rawBody) as {
      action?: string;
      repository?: { full_name?: string };
      issue?: GhIssue;
      pull_request?: { id: number; number: number; title: string; html_url: string; state: string };
    };
    const projectId = body.repository?.full_name ?? null;
    if (event === "issues" && body.issue && projectId) {
      if (body.action === "deleted") {
        return { events: [{ kind: "task.delete", providerId: String(body.issue.number), providerProjectId: projectId }] };
      }
      return { events: [{ kind: "task.upsert", task: toRemote(body.issue, projectId, ctx.mappings) }] };
    }
    if (event === "pull_request" && body.pull_request && projectId) {
      return {
        events: [{
          kind: "record.upsert",
          entityType: "pull_request",
          providerId: String(body.pull_request.number),
          providerProjectId: projectId,
          title: body.pull_request.title,
          url: body.pull_request.html_url,
          raw: { state: body.pull_request.state },
        }],
      };
    }
    return { events: [] };
  },
};
