"use client";

import Link from "next/link";
import { CheckSquare, FolderPlus, Plug, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Create"
        title="Create"
        className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-foreground transition hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/tasks">
            <CheckSquare className="size-4 text-muted" aria-hidden="true" />
            New task
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/projects">
            <FolderPlus className="size-4 text-muted" aria-hidden="true" />
            New project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/integrations">
            <Plug className="size-4 text-muted" aria-hidden="true" />
            Connect provider
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
