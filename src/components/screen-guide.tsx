"use client";

import { CircleHelp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { markGuideSeenAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GUIDES, guideIdForPath } from "@/lib/screen-guides";

// Opens the guide for the current screen the first time it is visited, and
// keeps a help button in the header to reopen it.
export function ScreenGuide({ seenVersions }: { seenVersions: Record<string, number> }) {
  const pathname = usePathname();
  const guideId = guideIdForPath(pathname);
  const guide = guideId ? GUIDES[guideId] : null;
  const [seen, setSeen] = useState(seenVersions);
  const [manualOpen, setManualOpen] = useState(false);

  if (!guide) return null;

  const unseen = seen[guide.id] !== guide.version;
  const open = unseen || manualOpen;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setManualOpen(true);
      return;
    }
    setManualOpen(false);
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
        title="Show guide for this screen"
        aria-label="Show guide for this screen"
        onClick={() => setManualOpen(true)}
      >
        <CircleHelp className="size-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85dvh] w-[min(100%-2rem,36rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{guide.title}</DialogTitle>
            <DialogDescription>{guide.intro}</DialogDescription>
          </DialogHeader>
          <dl className="mt-5 space-y-4">
            {guide.sections.map((section) => (
              <div key={section.heading}>
                <dt className="text-sm font-medium">{section.heading}</dt>
                <dd className="mt-1 text-sm text-muted">{section.body}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
