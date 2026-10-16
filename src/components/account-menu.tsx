"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";
import { logoutAction, themeAction } from "@/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AccountMenu({
  user,
  theme,
}: {
  user: { name: string; email: string };
  theme: "light" | "dark";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setTheme(next: "light" | "dark") {
    if (next === theme || pending) return;
    const formData = new FormData();
    formData.set("theme", next);
    startTransition(async () => {
      await themeAction(formData);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        title="Account"
        className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-foreground transition hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="mt-0.5 block truncate text-xs font-normal text-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings#profile">
            <UserRound className="size-4 text-muted" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem disabled={pending} onSelect={() => setTheme("light")}>
          <Sun className="size-4 text-muted" aria-hidden="true" />
          <span className="flex-1">Light</span>
          {theme === "light" ? <Check className="size-4" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onSelect={() => setTheme("dark")}>
          <Moon className="size-4 text-muted" aria-hidden="true" />
          <span className="flex-1">Dark</span>
          {theme === "dark" ? <Check className="size-4" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4 text-muted" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn("text-destructive focus:text-destructive")}
          onSelect={() => {
            startTransition(() => {
              void logoutAction();
            });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
