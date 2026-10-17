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
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  el.setAttribute("data-revealed", "");
}

function isInViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.97 && rect.bottom > vh * 0.02;
}

function hasMotionMarkers(root: HTMLElement) {
  return Boolean(root.querySelector("[data-reveal], [data-reveal-child]"));
}

function prepareAndObserve(root: HTMLElement) {
  const reduced = prefersReducedMotion();
  const blocks = collectBlocks(root);

  let tileCursor = 0;
  blocks.forEach((block, index) => {
    const sectionDelay = Math.max(Math.min(index, 12) * 100, tileCursor);

    if (isWholeView(block)) {
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

    if (!block.hasAttribute("data-reveal")) {
      block.setAttribute("data-reveal", "");
    }
    if (!block.style.getPropertyValue("--reveal-delay")) {
      block.style.setProperty("--reveal-delay", `${sectionDelay}ms`);
    }
    tileCursor = sectionDelay + ROW_STAGGER_MS;
  });

  root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el, index) => {
    if (!el.style.getPropertyValue("--reveal-delay")) {
      el.style.setProperty("--reveal-delay", `${Math.min(index, 12) * 90}ms`);
    }
  });

  if (reduced) {
    root.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-child]").forEach((el) => {
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

  for (const el of root.querySelectorAll<HTMLElement>("[data-reveal]")) {
    if (el.hasAttribute("data-revealed")) continue;
    if (isInViewport(el)) {
      reveal(el);
      el.querySelectorAll<HTMLElement>("[data-reveal-child]").forEach(reveal);
    } else {
      io.observe(el);
    }
  }

  for (const el of root.querySelectorAll<HTMLElement>("[data-reveal-child]")) {
    if (el.hasAttribute("data-revealed")) continue;
    if (el.closest("[data-reveal]")) continue;
    if (isInViewport(el)) {
      reveal(el);
    } else {
      io.observe(el);
    }
  }

  root.setAttribute("data-motion-ready", "");

  return () => {
    io.disconnect();
  };
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

    let cleanup = prepareAndObserve(root);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const rerun = (hold = false) => {
      if (hold) root.removeAttribute("data-motion-ready");
      cleanup();
      cleanup = prepareAndObserve(root);
    };

    // Nested Suspense (Tasks filters/results) swaps deep in the tree.
    const swapObserver = new MutationObserver((mutations) => {
      const added = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) => node instanceof HTMLElement),
      );
      if (!added) return;

      window.clearTimeout(timer);
      timer = setTimeout(() => {
        const firstPass = !hasMotionMarkers(root);
        // Only blank the page when there were no markers yet (loader → content).
        rerun(firstPass);
      }, 16);
    });
    swapObserver.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      swapObserver.disconnect();
      cleanup();
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
