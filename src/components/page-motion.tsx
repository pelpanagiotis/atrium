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

function collectBlocks(root: HTMLElement): HTMLElement[] {
  const wrapper =
    (root.firstElementChild instanceof HTMLElement && root.firstElementChild) || root;
  const direct = Array.from(wrapper.children).filter(isRevealTarget);
  if (direct.length >= 2) return direct;
  if (direct.length === 1) {
    const nested = Array.from(direct[0].children).filter(isRevealTarget);
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

function markChildItems(block: HTMLElement, parentDelayMs = 0): number {
  if (isWholeView(block)) return 0;

  const items = Array.from(block.querySelectorAll(CHILD_ITEM_SELECTOR)).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !el.hasAttribute("data-reveal") &&
      !el.hasAttribute("data-reveal-child") &&
      !el.closest("[data-no-reveal], [data-reveal-whole], .grid-cols-7, .board-card, .board-drag-preview, .board-drop-bar"),
  );
  const rows = groupByLayoutRow(items).slice(0, 8);
  let marked = 0;
  rows.forEach((row, rowIndex) => {
    const delay = parentDelayMs + rowIndex * ROW_STAGGER_MS;
    for (const item of row.slice(0, 12)) {
      item.setAttribute("data-reveal-child", "");
      item.style.setProperty("--reveal-delay", `${delay}ms`);
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

function prepareAndObserve(root: HTMLElement) {
  const reduced = prefersReducedMotion();
  const blocks = collectBlocks(root);

  let tileCursor = 0;
  blocks.forEach((block, index) => {
    const sectionDelay = Math.max(Math.min(index, 12) * 100, tileCursor);

    if (isWholeView(block)) {
      block.setAttribute("data-reveal", "");
      if (!block.style.getPropertyValue("--reveal-delay")) {
        block.style.setProperty("--reveal-delay", `${sectionDelay}ms`);
      }
      tileCursor = sectionDelay + ROW_STAGGER_MS;
      return;
    }

    const tileCount = markChildItems(block, sectionDelay);

    if (tileCount >= 2) {
      // Rows share a delay; advance past the last row in this block.
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

  // Reveal standalone sections
  for (const el of root.querySelectorAll<HTMLElement>("[data-reveal]")) {
    if (el.hasAttribute("data-revealed")) continue;
    if (isInViewport(el)) {
      reveal(el);
      el.querySelectorAll<HTMLElement>("[data-reveal-child]").forEach(reveal);
    } else {
      io.observe(el);
    }
  }

  // Reveal tiles that live outside a data-reveal parent (grid sections)
  for (const el of root.querySelectorAll<HTMLElement>("[data-reveal-child]")) {
    if (el.hasAttribute("data-revealed")) continue;
    if (el.closest("[data-reveal]")) continue;
    if (isInViewport(el)) {
      reveal(el);
    } else {
      io.observe(el);
    }
  }

  // Release the pre-paint hold in the same turn the markers are applied,
  // so the first painted frame is already the animation's start state.
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

    // Suspense swaps the loader for page content after the first effect.
    // Prepare in this callback (before paint) so items never appear, then animate.
    const swapObserver = new MutationObserver(() => {
      root.removeAttribute("data-motion-ready");
      cleanup();
      cleanup = prepareAndObserve(root);
    });
    swapObserver.observe(root, { childList: true, subtree: false });

    return () => {
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
