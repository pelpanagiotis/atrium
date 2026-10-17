"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Briefcase, Home } from "lucide-react";
import { updateWorkspaceKindAction } from "@/app/actions";
import { MenuSelect } from "@/components/ui/menu-select";

const OPTIONS = [
  {
    value: "personal",
    label: "Personal",
    description: "Private notes and solo work",
    icon: <Home className="size-3.5" aria-hidden="true" />,
  },
  {
    value: "work",
    label: "Work",
    description: "Shared team projects and sync",
    icon: <Briefcase className="size-3.5" aria-hidden="true" />,
  },
];

export function WorkspaceContextControl({
  workspaceId,
  kind,
  canEdit,
}: {
  workspaceId: string;
  kind: "personal" | "work";
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return <p className="text-xs uppercase tracking-[0.16em] text-muted">{kind}</p>;
  }

  return (
    <MenuSelect
      value={kind}
      options={OPTIONS}
      aria-label="Workspace context"
      disabled={pending}
      className="w-auto"
      triggerClassName="h-7 gap-1.5 rounded-md border-transparent bg-transparent px-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted hover:border-border hover:bg-accent hover:text-foreground"
      onValueChange={(next) => {
        if (next === kind || (next !== "personal" && next !== "work")) return;
        startTransition(async () => {
          const formData = new FormData();
          formData.set("workspaceId", workspaceId);
          formData.set("kind", next);
          await updateWorkspaceKindAction(formData);
          router.refresh();
        });
      }}
    />
  );
}
