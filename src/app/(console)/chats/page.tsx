import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { ScreenLoader } from "@/components/screen-loader";
import { ProviderIcon } from "@/components/provider-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listTodayChatMessages } from "@/server/chats/service";
import { formatRelativeWhen, initialsFromName } from "@/lib/utils";

export const instant = false;

export default function ChatsPage() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <ChatsContent />
    </Suspense>
  );
}

async function ChatsContent() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const canAdmin = current.role === "owner" || current.role === "admin";
  const feed = await listTodayChatMessages(user.id, current.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-4xl">Chats</h1>
          <p className="mt-2 text-sm text-muted">
            Latest Slack messages from {feed.dayLabel} ({feed.timeZone}). Works on Slack&apos;s free plan within the 90-day history window.
          </p>
        </div>
        {canAdmin ? (
          <Button asChild variant="outline">
            <Link href="/integrations" data-tour="chats-manage">Manage Slack</Link>
          </Button>
        ) : null}
      </div>

      {feed.connections.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-4 py-10 text-center">
          <MessagesSquare className="mx-auto size-8 text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">
            No Slack workspace connected yet.
            {canAdmin
              ? " Add a bot token on Integrations, invite the bot to channels, then return here."
              : " Ask an owner or admin to connect Slack."}
          </p>
          {canAdmin ? (
            <Button asChild className="mt-4">
              <Link href="/integrations" data-tour="chats-manage">Connect Slack</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {feed.errors.length > 0 ? (
        <ul className="space-y-2">
          {feed.errors.map((error) => (
            <li
              key={error.integrationId}
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error.message}
            </li>
          ))}
        </ul>
      ) : null}

      {feed.connections.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {feed.connections.map((connection) => (
            <Badge key={connection.id} tone={connection.status === "connected" ? "connected" : "neutral"}>
              <span className="inline-flex items-center gap-1.5">
                <ProviderIcon provider="slack" />
                {connection.displayName}
              </span>
            </Badge>
          ))}
        </div>
      ) : null}

      {feed.connections.length > 0 && feed.messages.length === 0 && feed.errors.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card px-4 py-8 text-sm text-muted">
          No messages yet today in channels the bot has joined. Invite the bot with{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/invite @YourApp</code> in each channel.
        </p>
      ) : null}

      {feed.messages.length > 0 ? (
        <ul data-tour="chats-feed" className="divide-y rounded-lg border bg-card">
          {feed.messages.map((message) => {
            const body = (
              <div className="flex gap-3 px-4 py-3 transition hover:bg-accent/30">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground ring-1 ring-border"
                  aria-hidden="true"
                >
                  {initialsFromName(message.userName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium">{message.userName}</span>
                    <span className="text-xs text-muted">{message.channelName}</span>
                    <span className="text-xs text-muted">{formatRelativeWhen(message.at)}</span>
                    {feed.connections.length > 1 ? (
                      <span className="text-xs text-muted">· {message.integrationName}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {message.text}
                  </p>
                </div>
                <ProviderIcon provider="slack" className="mt-0.5 shrink-0" />
              </div>
            );
            return (
              <li key={`${message.integrationId}:${message.channelId}:${message.ts}`}>
                {message.permalink ? (
                  <a href={message.permalink} target="_blank" rel="noreferrer" className="block">
                    {body}
                  </a>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
