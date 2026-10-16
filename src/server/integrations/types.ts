import type { Tx } from "../db/client";

export const PROVIDERS = ["linear", "jira", "github", "gitlab", "gitea", "fake"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const TASK_STATUSES = ["open", "in_progress", "blocked", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type EntityType = "issue" | "pull_request" | "project" | "comment" | "other";

export type FieldMappings = {
  status?: Partial<Record<TaskStatus, string>>;
  priority?: Partial<Record<TaskPriority, string>>;
  assignees?: Record<string, string>;
};

export type StoredCredential = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  webhookSecret?: string;
  cloudId?: string;
  siteUrl?: string;
  accountLabel?: string;
};

export type ProviderCapabilities = {
  createTask: boolean;
  updateTask: boolean;
  archiveTask: boolean;
  webhooks: boolean;
  fields: {
    title: boolean;
    description: boolean;
    status: boolean;
    priority: boolean;
    assignee: boolean;
    dueDate: boolean;
  };
};

export type RemoteProject = {
  providerId: string;
  key: string | null;
  name: string;
  url: string | null;
};

export type RemoteTask = {
  providerId: string;
  providerProjectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assigneeProviderId: string | null;
  assigneeLabel: string | null;
  url: string | null;
  updatedAt: string | null;
  archived: boolean;
  raw: Record<string, unknown>;
};

export type TaskWrite = {
  providerProjectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  assigneeProviderId?: string | null;
  operationId: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export type WebhookRequest = {
  rawBody: string;
  headers: Record<string, string>;
};

export type ParsedWebhookEvent =
  | { kind: "task.upsert"; task: RemoteTask }
  | { kind: "task.delete"; providerId: string; providerProjectId: string | null }
  | {
      kind: "record.upsert";
      entityType: EntityType;
      providerId: string;
      providerProjectId: string | null;
      title: string;
      url: string | null;
      raw: Record<string, unknown>;
    };

export type ParsedWebhook = { events: ParsedWebhookEvent[] };

export type AdapterContext = {
  tx: Tx;
  integrationId: string;
  credentials: StoredCredential;
  mappings: FieldMappings;
};

export interface IntegrationAdapter {
  provider: ProviderId;
  validateConnection(ctx: AdapterContext): Promise<{ accountLabel: string; externalAccountId: string }>;
  getCapabilities(): ProviderCapabilities;
  listProjects(ctx: AdapterContext, cursor?: string | null): Promise<Page<RemoteProject>>;
  listTasks(
    ctx: AdapterContext,
    query: { providerProjectId: string; cursor?: string | null },
  ): Promise<Page<RemoteTask>>;
  getTask(ctx: AdapterContext, providerId: string, providerProjectId: string): Promise<RemoteTask>;
  createTask(ctx: AdapterContext, input: TaskWrite): Promise<RemoteTask>;
  updateTask(ctx: AdapterContext, providerId: string, input: Partial<TaskWrite> & { providerProjectId: string; operationId: string }): Promise<RemoteTask>;
  archiveTask?(ctx: AdapterContext, providerId: string, providerProjectId: string): Promise<RemoteTask>;
  verifyWebhook(ctx: AdapterContext, request: WebhookRequest): Promise<boolean>;
  parseWebhook(ctx: AdapterContext, request: WebhookRequest): Promise<ParsedWebhook>;
  defaultMappings(): FieldMappings;
}

export class ProviderError extends Error {
  readonly code:
    | "rate_limited"
    | "unauthorized"
    | "not_found"
    | "validation"
    | "unavailable"
    | "unsupported"
    | "conflict";
  readonly retryable: boolean;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    code: ProviderError["code"],
    retryable: boolean,
    status?: number,
    retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function operationMarker(operationId: string): string {
  return `ATRIUM-OP:${operationId}`;
}
