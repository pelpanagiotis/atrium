"use client";

import { useActionState, useState } from "react";
import { ArrowUp, ExternalLink } from "lucide-react";
import { addTaskCommentAction, type ActionState } from "@/app/actions";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeWhen, initialsFromName } from "@/lib/utils";
import type { TaskCommentView } from "@/server/tasks/comments";

const AVATAR_TONES = [
  "bg-sky-600 text-white",
  "bg-emerald-600 text-white",
  "bg-violet-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-teal-600 text-white",
  "bg-indigo-600 text-white",
] as const;

function avatarTone(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}

function CommentAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initials = initialsFromName(name) || "?";
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tracking-wide",
        size === "sm" ? "size-6" : "size-8 text-xs",
        avatarTone(name),
      )}
    >
      {initials}
    </span>
  );
}

export function TaskComments({
  taskId,
  comments,
  source,
  canComment,
  canWrite,
  unavailableReason,
  currentUserName,
}: {
  taskId: string;
  comments: TaskCommentView[];
  source: "native" | string;
  canComment: boolean;
  canWrite: boolean;
  unavailableReason: string | null;
  currentUserName?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addTaskCommentAction, {});
  const [draft, setDraft] = useState("");
  const sourceName = source === "native" ? "Atrium" : providerLabel(source);
  const showComposer = canWrite && canComment && !unavailableReason;
  const composerName = currentUserName?.trim() || "You";

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">Activity</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {source !== "native" ? <ProviderIcon provider={source} className="size-3.5" /> : null}
          <span>{sourceName}</span>
        </div>
      </div>

      {unavailableReason ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted">{unavailableReason}</p>
      ) : null}

      {!unavailableReason && comments.length === 0 ? (
        <p className="px-1 text-sm text-muted">No activity yet on this {sourceName} issue.</p>
      ) : null}

      {!unavailableReason && comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border bg-card p-3">
              <div className="flex gap-3">
                <CommentAvatar name={comment.authorLabel} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-sm font-medium">{comment.authorLabel}</p>
                    <time
                      dateTime={comment.createdAt}
                      title={new Date(comment.createdAt).toLocaleString()}
                      className="text-xs text-muted"
                      suppressHydrationWarning
                    >
                      {formatRelativeWhen(comment.createdAt)}
                    </time>
                    {comment.url ? (
                      <a
                        href={comment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted underline-offset-2 hover:underline"
                      >
                        Open
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {showComposer ? (
        <form action={formAction} className="mt-auto space-y-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="returnTo" value={`/tasks/${taskId}`} />
          <div className="rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring">
            <div className="flex items-start gap-3 px-3 pt-3">
              <CommentAvatar name={composerName} size="sm" />
              <textarea
                id="task-comment-body"
                name="body"
                rows={3}
                required
                maxLength={10000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Leave a comment…"
                aria-label="Leave a comment"
                className="min-h-16 w-full resize-none bg-transparent py-0.5 text-sm outline-none placeholder:text-muted"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-2 pb-2 pt-1">
              <Button
                type="submit"
                size="icon"
                disabled={pending || draft.trim().length === 0}
                aria-label={pending ? "Posting comment" : `Post comment to ${sourceName}`}
                title={`Post to ${sourceName}`}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </form>
      ) : null}

      {canWrite && !canComment && !unavailableReason ? (
        <p className="text-sm text-muted">Comments cannot be added for this source yet.</p>
      ) : null}

      {!canWrite ? (
        <p className="text-sm text-muted">Your role can view activity. Members and above can comment.</p>
      ) : null}
    </section>
  );
}
