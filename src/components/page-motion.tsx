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

function markChildItems(block: HTMLElement, parentDelayMs = 0): number {
  const items = Array.from(block.querySelectorAll(CHILD_ITEM_SELECTOR)).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !el.hasAttribute("data-reveal") &&
      !el.hasAttribute("data-reveal-child") &&
      !el.closest("[data-no-reveal], .board-card, .board-drag-preview, .board-drop-bar"),
  );
  const marked = items.slice(0, 24);
  marked.forEach((item, index) => {
    item.setAttribute("data-reveal-child", "");
    // Each tile slides in after the previous — ~75ms apart
    const delay = parentDelayMs + Math.min(index, 18) * 75;
    item.style.setProperty("--reveal-delay", `${delay}ms`);
  });
  return marked.length;
}

function reveal(el: HTMLElement) {
  // Retrigger CSS animation if this node was revealed before (e.g. soft remount)
  if (el.hasAttribute("data-revealed")) {
    el.removeAttribute("data-revealed");
    // Force reflow so the next attribute set restarts the animation
    void el.offsetWidth;
  }
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
    const sectionDelay = Math.min(index, 12) * 90;
    const tileCount = markChildItems(block, Math.max(sectionDelay, tileCursor));

    if (tileCount >= 2) {
      // Animate tiles individually; keep the wrapper visible so stagger reads clearly
      tileCursor = Math.max(sectionDelay, tileCursor) + tileCount * 75 + 40;
      return;
    }

    if (!block.hasAttribute("data-reveal")) {
      block.setAttribute("data-reveal", "");
    }
    if (!block.style.getPropertyValue("--reveal-delay")) {
      block.style.setProperty("--reveal-delay", `${sectionDelay}ms`);
    }
    if (tileCount === 1) {
      tileCursor = sectionDelay + 75 + 40;
    }
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

    const rerun = () => {
      cleanup();
      cleanup = prepareAndObserve(root);
    };

    // Page bodies resolve inside nested Suspense after the first paint —
    // re-run when PageMotion's direct child swaps (loader → content).
    const swapObserver = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = setTimeout(rerun, 16);
    });
    swapObserver.observe(root, { childList: true, subtree: false });

    // Backup pass after Suspense typically settles.
    const settled = window.setTimeout(rerun, 80);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settled);
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
