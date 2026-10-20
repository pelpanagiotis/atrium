"use client";

import { CircleHelp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { markGuideSeenAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScreenTour } from "@/components/screen-tour";
import { GUIDES, guideIdForPath } from "@/lib/screen-guides";

// Opens the guide for the current screen the first time it is visited. The
// guide is a short intro, then a spotlight tour of the screen. A help button
// in the header restarts it.
export function ScreenGuide({ seenVersions }: { seenVersions: Record<string, number> }) {
  const pathname = usePathname();
  const guideId = guideIdForPath(pathname);
  const guide = guideId ? GUIDES[guideId] : null;
  const [seen, setSeen] = useState(seenVersions);
  const [manual, setManual] = useState<"intro" | "tour" | null>(null);

  if (!guide) return null;

  const unseen = seen[guide.id] !== guide.version;
  const phase = manual ?? (unseen ? "intro" : null);

  const finishFlow = () => {
    setManual(null);
    if (!unseen) return;
    setSeen((current) => ({ ...current, [guide.id]: guide.version }));
    // If the save fails, the guide stays marked as seen for this session and
    // shows again on the next visit.
    markGuideSeenAction(guide.id, guide.version).catch(() => undefined);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        data-tour="guide-help"
        title="Show guide for this screen"
        aria-label="Show guide for this screen"
        onClick={() => setManual("intro")}
      >
        <CircleHelp className="size-4" aria-hidden="true" />
      </Button>
      <Dialog
        open={phase === "intro"}
        onOpenChange={(next) => {
          if (!next) finishFlow();
        }}
      >
        <DialogContent className="w-[min(100%-2rem,32rem)]">
          <DialogHeader>
            <DialogTitle>{guide.title}</DialogTitle>
            <DialogDescription>{guide.intro}</DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={finishFlow}>
              Skip
            </Button>
            <Button type="button" onClick={() => setManual("tour")}>
              Start tour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {phase === "tour" ? <ScreenTour steps={guide.tour} onClose={finishFlow} /> : null}
    </>
  );
}
