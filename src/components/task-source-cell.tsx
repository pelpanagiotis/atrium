"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { SyncStateIcon } from "@/components/task-meta-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TaskSourceCell({
  syncState,
  provider,
  externalUrl,
  title,
}: {
  syncState: string;
  provider: string | null;
  externalUrl: string | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const sourceLabel = providerLabel(provider);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <SyncStateIcon state={syncState} className="size-4" />
        <ProviderIcon provider={provider} />
      </div>
      {externalUrl ? (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Open
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="flex h-[min(85dvh,52rem)] w-[min(100%-2rem,72rem)] max-w-none flex-col gap-3 overflow-hidden p-4">
              <DialogHeader className="shrink-0">
                <DialogTitle className="truncate pr-8 text-base">{title}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <span>Preview from {sourceLabel}</span>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                  >
                    Open in new tab
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
                <iframe
                  key={externalUrl}
                  src={externalUrl}
                  title={`${title} — ${sourceLabel}`}
                  className="size-full border-0 bg-background"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
