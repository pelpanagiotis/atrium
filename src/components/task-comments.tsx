"use client";

import { useActionState } from "react";
import { ExternalLink } from "lucide-react";
import { addTaskCommentAction, type ActionState } from "@/app/actions";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { formatWhen } from "@/lib/utils";
import type { TaskCommentView } from "@/server/tasks/comments";

export function TaskComments({
  taskId,
  comments,
  source,
  canComment,
  canWrite,
  unavailableReason,
}: {
  taskId: string;
  comments: TaskCommentView[];
  source: "native" | string;
  canComment: boolean;
  canWrite: boolean;
  unavailableReason: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addTaskCommentAction, {});
  const sourceName = source === "native" ? "Atrium" : providerLabel(source);
  const showComposer = canWrite && canComment && !unavailableReason;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">Comments</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {source !== "native" ? <ProviderIcon provider={source} className="size-3.5" /> : null}
          <span>{sourceName}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {unavailableReason ? (
          <p className="px-5 py-4 text-sm text-muted">{unavailableReason}</p>
        ) : comments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No comments yet on this {sourceName} issue.</p>
        ) : (
          <ul className="divide-y">
            {comments.map((comment) => (
              <li key={comment.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{comment.authorLabel}</p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <time dateTime={comment.createdAt}>{formatWhen(comment.createdAt)}</time>
                    {comment.url ? (
                      <a
                        href={comment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                      >
                        Open
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showComposer ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="returnTo" value={`/tasks/${taskId}`} />
          <div>
            <Label htmlFor="task-comment-body">Add a comment</Label>
            <Textarea
              id="task-comment-body"
              name="body"
              rows={4}
              required
              maxLength={10000}
              placeholder={`Write a comment that posts to ${sourceName}…`}
              className="mt-1"
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Posting…" : `Post to ${sourceName}`}
          </Button>
        </form>
      ) : null}

      {canWrite && !canComment && !unavailableReason ? (
        <p className="text-sm text-muted">Comments cannot be added for this source yet.</p>
      ) : null}

      {!canWrite ? (
        <p className="text-sm text-muted">Your role can view comments. Members and above can post.</p>
      ) : null}
    </section>
  );
}
