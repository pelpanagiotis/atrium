"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const CHILD_ITEM_SELECTOR = [
  ":scope > a",
  ":scope > li",
  ":scope > article",
  ":scope > section",
  ":scope > [class*='rounded-lg'][class*='border']",
  ":scope > ul > li",
  ":scope > .grid > *",
  ":scope > [class*='grid'] > *",
  ":scope [data-reveal-items] > *",
  ":scope ul.divide-y > li",
].join(", ");

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.motion === "off") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isRevealTarget(el: Element): el is HTMLElement {
  return (
    el instanceof HTMLElement &&
    !el.hasAttribute("data-no-reveal") &&
    !el.closest("[data-no-reveal]") &&
    el.tagName !== "SCRIPT" &&
    el.tagName !== "STYLE"
  );
}

/** Unwrap single-child layout shells until we find real page sections. */
function findSectionRoot(root: HTMLElement): HTMLElement {
  let current =
    (root.firstElementChild instanceof HTMLElement && root.firstElementChild) || root;

  for (let depth = 0; depth < 8; depth += 1) {
    const kids = Array.from(current.children).filter(isRevealTarget);
    if (kids.length >= 2) return current;
    if (kids.length === 1) {
      current = kids[0]!;
      continue;
    }
    break;
  }
  return current;
}

function collectBlocks(root: HTMLElement): HTMLElement[] {
  const sectionRoot = findSectionRoot(root);
  const direct = Array.from(sectionRoot.children).filter(isRevealTarget);
  if (direct.length >= 2) return direct;
  if (direct.length === 1) {
    const nested = Array.from(direct[0]!.children).filter(isRevealTarget);
    if (nested.length >= 2) return nested;
  }
  return direct;
}

const ROW_TOLERANCE_PX = 16;
const ROW_STAGGER_MS = 90;

function isWholeView(block: HTMLElement) {
  return (
    block.hasAttribute("data-reveal-whole") ||
    Boolean(block.querySelector(":scope .grid-cols-7"))
  );
}

function groupByLayoutRow(items: HTMLElement[]): HTMLElement[][] {
  const rows: { top: number; items: HTMLElement[] }[] = [];
  const sorted = [...items].sort((a, b) => {
    const aBox = a.getBoundingClientRect();
    const bBox = b.getBoundingClientRect();
    const dy = aBox.top - bBox.top;
    if (Math.abs(dy) > ROW_TOLERANCE_PX) return dy;
    return aBox.left - bBox.left;
  });

  for (const item of sorted) {
    const top = item.getBoundingClientRect().top;
    const row = rows.find((candidate) => Math.abs(candidate.top - top) <= ROW_TOLERANCE_PX);
    if (row) row.items.push(item);
    else rows.push({ top, items: [item] });
  }

  return rows.map((row) => row.items);
}

function markItem(el: HTMLElement, delayMs: number) {
  el.removeAttribute("data-reveal-pending");
  el.setAttribute("data-reveal-child", "");
  el.style.setProperty("--reveal-delay", `${delayMs}ms`);
}

function markChildItems(block: HTMLElement, parentDelayMs = 0): number {
  if (isWholeView(block)) return 0;

  // Vertical lists: stagger by index (layout tops are unreliable while parents are hidden).
  const listItems = Array.from(
    block.querySelectorAll<HTMLElement>(":scope [data-reveal-items] > *, :scope ul.divide-y > li"),
  ).filter(
    (el) =>
      !el.hasAttribute("data-reveal") &&
      !el.hasAttribute("data-reveal-child") &&
      !el.closest("[data-no-reveal], .board-card"),
  );
  if (listItems.length >= 1) {
    listItems.slice(0, 16).forEach((item, index) => {
      markItem(item, parentDelayMs + index * ROW_STAGGER_MS);
    });
    return Math.min(listItems.length, 16);
  }

  const items = Array.from(block.querySelectorAll(CHILD_ITEM_SELECTOR)).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !el.hasAttribute("data-reveal") &&
      !el.hasAttribute("data-reveal-child") &&
      !el.closest("[data-no-reveal], [data-reveal-whole], .grid-cols-7, .board-card, .board-drag-preview, .board-drop-bar"),
  );
  const rows = groupByLayoutRow(items).slice(0, 12);
  let marked = 0;
  rows.forEach((row, rowIndex) => {
    const delay = parentDelayMs + rowIndex * ROW_STAGGER_MS;
    for (const item of row.slice(0, 16)) {
      markItem(item, delay);
      marked += 1;
    }
  });
  return marked;
}

function reveal(el: HTMLElement) {
  if (el.hasAttribute("data-revealed")) return;
  el.removeAttribute("data-reveal-pending");
  el.setAttribute("data-revealed", "");
}

function isInViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.97 && rect.bottom > vh * 0.02;
}

/** Hide incoming DOM before the next paint so it never flashes at rest position. */
function suppressIncoming(nodes: Iterable<Node>) {
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.hasAttribute("data-no-reveal") || node.closest("[data-no-reveal]")) continue;
    if (
      !node.hasAttribute("data-reveal") &&
      !node.hasAttribute("data-reveal-child") &&
      !node.hasAttribute("data-revealed")
    ) {
      node.setAttribute("data-reveal-pending", "");
    }
  }
}

function prepareMarkers(root: HTMLElement) {
  const blocks = collectBlocks(root);

  let tileCursor = 0;
  blocks.forEach((block, index) => {
    const sectionDelay = Math.max(Math.min(index, 12) * 100, tileCursor);

    if (isWholeView(block)) {
      block.removeAttribute("data-reveal-pending");
      if (!block.hasAttribute("data-reveal")) {
        block.setAttribute("data-reveal", "");
      }
      if (!block.style.getPropertyValue("--reveal-delay")) {
        block.style.setProperty("--reveal-delay", `${sectionDelay}ms`);
      }
      tileCursor = sectionDelay + ROW_STAGGER_MS;
      return;
    }

    const tileCount = markChildItems(block, sectionDelay);

    if (tileCount >= 2) {
      const rowCount = new Set(
        Array.from(block.querySelectorAll<HTMLElement>("[data-reveal-child]")).map((el) =>
          el.style.getPropertyValue("--reveal-delay"),
        ),
      ).size;
      tileCursor = sectionDelay + Math.max(rowCount, 1) * ROW_STAGGER_MS;
      return;
    }

    block.removeAttribute("data-reveal-pending");
    if (!block.hasAttribute("data-reveal")) {
      block.setAttribute("data-reveal", "");
    }
    if (!block.style.getPropertyValue("--reveal-delay")) {
      block.style.setProperty("--reveal-delay", `${sectionDelay}ms`);
    }
    tileCursor = sectionDelay + ROW_STAGGER_MS;
  });

  root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el, index) => {
    el.removeAttribute("data-reveal-pending");
    if (!el.style.getPropertyValue("--reveal-delay")) {
      el.style.setProperty("--reveal-delay", `${Math.min(index, 12) * 90}ms`);
    }
  });
}

function collectPendingTargets(root: HTMLElement): HTMLElement[] {
  const targets: HTMLElement[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-child]")) {
    if (!el.hasAttribute("data-revealed")) targets.push(el);
  }
  return targets;
}

function armReveals(root: HTMLElement, targets: HTMLElement[]) {
  const reduced = prefersReducedMotion();
  if (reduced) {
    root
      .querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-child], [data-reveal-pending]")
      .forEach((el) => {
        el.removeAttribute("data-reveal-pending");
        el.setAttribute("data-revealed", "");
      });
    root.setAttribute("data-motion-ready", "");
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        if (!(target instanceof HTMLElement)) continue;
        reveal(target);
        if (target.hasAttribute("data-reveal")) {
          target.querySelectorAll<HTMLElement>("[data-reveal-child]").forEach(reveal);
        }
        io.unobserve(target);
      }
    },
    { root: null, rootMargin: "0px 0px -4% 0px", threshold: 0.06 },
  );

  for (const el of targets) {
    if (el.hasAttribute("data-revealed")) continue;

    if (el.hasAttribute("data-reveal-child")) {
      const parent = el.closest<HTMLElement>("[data-reveal]");
      // Parent already shown: still animate this late-arriving child.
      if (parent?.hasAttribute("data-revealed")) {
        if (isInViewport(el) || isInViewport(parent)) reveal(el);
        else io.observe(el);
        continue;
      }
      // Wait for the parent section unless this child is a top-level tile.
      if (parent && !parent.hasAttribute("data-revealed")) continue;
    }

    if (isInViewport(el)) {
      reveal(el);
      if (el.hasAttribute("data-reveal")) {
        el.querySelectorAll<HTMLElement>("[data-reveal-child]").forEach(reveal);
      }
    } else {
      io.observe(el);
    }
  }

  root.querySelectorAll("[data-reveal-pending]").forEach((el) => {
    el.removeAttribute("data-reveal-pending");
  });
  root.setAttribute("data-motion-ready", "");

  return () => {
    io.disconnect();
  };
}

function prepareAndObserve(root: HTMLElement, opts?: { hold?: boolean }) {
  if (opts?.hold !== false) {
    // Hold the page invisible while markers are attached (initial / full swap).
    root.removeAttribute("data-motion-ready");
  }
  prepareMarkers(root);

  const pending = collectPendingTargets(root);

  // Flush hidden styles before revealing so the first paint is the start keyframe,
  // not the resting layout.
  void root.offsetWidth;

  return armReveals(root, pending);
}

export function PageMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const cleanups = new Set<() => void>();
    const track = (fn: () => void) => {
      cleanups.add(fn);
      return () => {
        cleanups.delete(fn);
        fn();
      };
    };

    track(prepareAndObserve(root, { hold: true }));
    let microtaskQueued = false;

    const swapObserver = new MutationObserver((mutations) => {
      const added: HTMLElement[] = [];
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) added.push(node);
        }
      }
      if (added.length === 0) return;

      // Hide newcomers immediately (mutation callback runs before paint).
      suppressIncoming(added);

      if (microtaskQueued) return;
      microtaskQueued = true;
      queueMicrotask(() => {
        microtaskQueued = false;

        const ready = root.hasAttribute("data-motion-ready");
        // Loader uses data-no-reveal, so the shell can be "ready" before real
        // content exists. Treat that like an initial paint and hold visibility.
        const hasRevealedContent = Boolean(
          root.querySelector(
            "[data-reveal][data-revealed], [data-reveal-child][data-revealed]",
          ),
        );

        if (!ready || !hasRevealedContent) {
          for (const fn of [...cleanups]) fn();
          cleanups.clear();
          track(prepareAndObserve(root, { hold: true }));
          return;
        }

        // Nested swaps (filters → results): keep the shell, arm only newcomers.
        prepareMarkers(root);
        const pending = collectPendingTargets(root);
        if (pending.length === 0) {
          for (const el of added) el.removeAttribute("data-reveal-pending");
          root.querySelectorAll("[data-reveal-pending]").forEach((el) => {
            el.removeAttribute("data-reveal-pending");
          });
          return;
        }

        void root.offsetWidth;
        track(armReveals(root, pending));
      });
    });
    swapObserver.observe(root, { childList: true, subtree: true });

    return () => {
      microtaskQueued = false;
      swapObserver.disconnect();
      for (const fn of cleanups) fn();
      cleanups.clear();
    };
  }, [routeKey]);

  return (
    <div
      key={routeKey}
      ref={ref}
      className={cn("page-motion flex min-h-0 flex-1 flex-col", className)}
      data-page-motion=""
    >
      {children}
    </div>
  );
}
