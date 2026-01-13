// src/components/DesktopSidePanel.tsx
"use client";

import { ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Side = "left" | "right";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DesktopSidePanel({
  side,
  open,
  onOpenChange,
  width,
  handleSize = 34,
  className = "",
  children,
}: {
  side: Side;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /**
   * Preferred panel width in px. The actual rendered width may vary depending on CSS.
   * This value is used as a fallback before we can measure the real width.
   */
  width?: number;
  /** Width of the always-visible toggle handle in px. */
  handleSize?: number;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(width ?? 420);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Guard: rect.width can be 0 right after mount when hidden by transform.
      if (rect.width > 0) setMeasuredWidth(rect.width);
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      // Fallback for older browsers.
      const id = window.setInterval(update, 500);
      return () => window.clearInterval(id);
    }

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const safeHandle = clamp(handleSize, 24, 64);
  const maxOffset = useMemo(() => Math.max(0, measuredWidth - safeHandle), [measuredWidth, safeHandle]);

  const translateX = useMemo(() => {
    if (open) return 0;
    return side === "left" ? -maxOffset : maxOffset;
  }, [open, side, maxOffset]);

  const arrow = useMemo(() => {
    if (side === "left") return open ? "\u25C2" : "\u25B8"; // ◂ / ▸
    return open ? "\u25B8" : "\u25C2"; // ▸ / ◂
  }, [open, side]);

  return (
    <div
      ref={ref}
      className={[
        "absolute top-0 bottom-0",
        side === "left" ? "left-0" : "right-0",
        "transition-transform duration-300 ease-out will-change-transform",
        "pointer-events-auto",
        className,
      ].join(" ")}
      style={{ transform: `translateX(${translateX}px)` }}
    >
      {/* Handle (always visible) */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={[
          "absolute top-1/2 -translate-y-1/2",
          side === "left" ? "right-0" : "left-0",
          "h-16",
          "flex items-center justify-center",
          "bg-neutral-900/90 backdrop-blur",
          "border border-neutral-700",
          "shadow-lg",
          "text-neutral-100",
          "hover:bg-neutral-800/90",
          "active:scale-[0.98]",
          "select-none",
          "rounded-xl",
        ].join(" ")}
        style={{ width: safeHandle }}
        aria-label={open ? t("sheet.hide") : t("sheet.show")}
        title={open ? t("sheet.hide") : t("sheet.show")}
      >
        <span className="text-2xl leading-none">{arrow}</span>
      </button>

      {/* Content */}
      <div
        className={[
          "h-full",
          // Keep content from sitting under the handle.
          side === "left" ? "pr-[34px]" : "pl-[34px]",
        ].join(" ")}
        // Inline because handleSize is configurable.
        style={
          side === "left"
            ? { paddingRight: safeHandle }
            : { paddingLeft: safeHandle }
        }
      >
        {children}
      </div>
    </div>
  );
}
