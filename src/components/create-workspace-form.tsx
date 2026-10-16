"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createWorkspaceAction, type ActionState } from "@/app/actions";
import { WorkspaceIconPicker } from "@/components/workspace-icon-picker";
import { WorkspaceKindPicker } from "@/components/workspace-kind-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";

export function CreateWorkspaceForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createWorkspaceAction, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden="true" />
          Create workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(100%-2rem,32rem)]">
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>Personal and work contexts stay isolated from each other.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="grid gap-2">
              <Label htmlFor="create-workspace-name">Name</Label>
              <Input id="create-workspace-name" name="name" placeholder="Northwind Studio" required />
            </div>
            <WorkspaceKindPicker id="create-workspace-kind" defaultValue="work" />
          </div>
          <WorkspaceIconPicker defaultValue="🏢" id="create-workspace-icon" />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Creating…" : "Create workspace"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
